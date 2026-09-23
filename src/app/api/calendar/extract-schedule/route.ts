import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extractScheduleFromImageWithGemini,
  rescheduleConflictingCalendarTasksWithGemini,
} from '@/services/ai/scheduleAiService';
import { z } from 'zod';

const extractScheduleBodySchema = z.object({
  base64Data: z.string().min(1, 'El contenido base64 es requerido'),
  mimeType: z.string().min(1, 'El mimeType es requerido'),
  guardarEnDisponibilidad: z.boolean().optional().default(true),
});

/**
 * POST /api/calendar/extract-schedule
 * Recibe una imagen (PNG, JPG, WEBP) o documento PDF del horario académico/laboral,
 * utiliza Gemini con visión multimodal para extraer las materias y horas,
 * opcionalmente guarda los bloques en 'bloques_disponibilidad', evalúa si hay
 * tareas asignadas en conflicto y las reagenda automáticamente con IA,
 * retornando los bloques y el resultado del reagendamiento.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión.' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = extractScheduleBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: parsed.error.issues },
        { status: 400 },
      );
    }

    const { base64Data, mimeType, guardarEnDisponibilidad } = parsed.data;

    // Ejecutar extracción con visión multimodal de Gemini
    const resultado = await extractScheduleFromImageWithGemini({
      base64Data,
      mimeType,
      usuarioId: user.id,
    });

    let reagendamientoResult = null;

    if (guardarEnDisponibilidad && resultado.bloques.length > 0) {
      const inserts = resultado.bloques.map((b) => ({
        usuario_id: user.id,
        dia_semana: b.dia_semana,
        hora_inicio: b.hora_inicio,
        hora_fin: b.hora_fin,
        tipo: b.tipo,
        origen: 'extraido_ia' as const,
      }));

      const { error: insertErr } = await supabase.from('bloques_disponibilidad').insert(inserts);

      if (insertErr) {
        console.warn('Advertencia guardando bloques en bloques_disponibilidad:', insertErr);
      }

      // Reagendar automáticamente cualquier tarea que colisione con el nuevo horario
      try {
        reagendamientoResult = await rescheduleConflictingCalendarTasksWithGemini(user.id);
      } catch (rescheduleErr) {
        console.warn('Aviso reagendando tareas en conflicto tras subir horario:', rescheduleErr);
      }
    }

    return NextResponse.json({
      success: true,
      bloques: resultado.bloques,
      observaciones: resultado.observaciones || null,
      reagendamiento: reagendamientoResult,
    });
  } catch (error) {
    console.error('Error en POST /api/calendar/extract-schedule:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error procesando horario con IA',
      },
      { status: 500 },
    );
  }
}
