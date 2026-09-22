import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateScheduleRequestSchema } from '@/features/schedule/types/scheduleSchemas';
import {
  generateScheduleWithGemini,
  extractScheduleFromImageWithGemini,
} from '@/services/ai/scheduleAiService';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: Params) {
  const { id: projectId } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado.' },
        { status: 401 },
      );
    }

    // 1. Verificar existencia del proyecto y permisos
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select(
        'id, user_id, titulo, objetivo, fecha_limite, prioridad, nivel_conocimiento, minutos_diarios, material_url',
      )
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projErr || !project) {
      return NextResponse.json(
        { success: false, error: 'Proyecto no encontrado o sin permisos.' },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsedInput = generateScheduleRequestSchema.safeParse(body);

    const inputData = parsedInput.success ? parsedInput.data : {};

    const nombreProyecto = inputData.nombre_proyecto || project.titulo;
    const objetivo = inputData.objetivo_final || project.objetivo;
    const fechaLimite =
      inputData.fecha_limite ||
      (project.fecha_limite ? project.fecha_limite.split('T')[0] : undefined);
    const importancia = inputData.importancia || project.prioridad || 'Prioritario';
    const nivel = inputData.nivel_conocimiento || project.nivel_conocimiento || 'Principiante';
    const tiempoDiario = inputData.tiempo_diario_disponible || project.minutos_diarios || 30;

    // 2. Procesar archivos adjuntos: si son imágenes de horario, usar visión de Gemini
    let textoAdjuntos = '';
    const nuevosBloquesDetectados: Array<{
      dia_semana: number;
      hora_inicio: string;
      hora_fin: string;
      tipo: string;
    }> = [];

    if (inputData.archivos_adjuntos && inputData.archivos_adjuntos.length > 0) {
      for (const archivo of inputData.archivos_adjuntos) {
        if (archivo.textoExtraido) {
          textoAdjuntos += `\n[Archivo: ${archivo.nombre}]\n${archivo.textoExtraido}\n`;
        } else if (archivo.contenidoBase64 && archivo.tipo.startsWith('image/')) {
          try {
            const horarioExtraido = await extractScheduleFromImageWithGemini({
              base64Data: archivo.contenidoBase64,
              mimeType: archivo.tipo,
              usuarioId: user.id,
            });

            if (horarioExtraido.bloques.length > 0) {
              nuevosBloquesDetectados.push(...horarioExtraido.bloques);
              // Guardar bloques extraídos en bloques_disponibilidad
              const inserts = horarioExtraido.bloques.map((b) => ({
                usuario_id: user.id,
                dia_semana: b.dia_semana,
                hora_inicio: b.hora_inicio,
                hora_fin: b.hora_fin,
                tipo: b.tipo,
                origen: 'extraido_ia' as const,
              }));
              await supabase.from('bloques_disponibilidad').insert(inserts);
            }
          } catch (visionErr) {
            console.warn(`Advertencia procesando imagen de horario ${archivo.nombre}:`, visionErr);
          }
        }
      }
    }

    // 3. Consultar disponibilidad actual del usuario
    const { data: disponibilidadActual } = await supabase
      .from('bloques_disponibilidad')
      .select('dia_semana, fecha_especifica, hora_inicio, hora_fin, tipo')
      .eq('usuario_id', user.id);

    let bloquesDisponibilidadTexto = '';
    if (disponibilidadActual && disponibilidadActual.length > 0) {
      const diasNombres = [
        'Domingo',
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado',
      ];
      bloquesDisponibilidadTexto = disponibilidadActual
        .map((b) => {
          const dia =
            b.fecha_especifica || (b.dia_semana !== null ? diasNombres[b.dia_semana] : 'General');
          return `- ${dia}: ${b.hora_inicio} a ${b.hora_fin} (${b.tipo})`;
        })
        .join('\n');
    }

    // 4. Llamar a Gemini para generar cronograma estructurado
    const scheduleResult = await generateScheduleWithGemini({
      usuarioId: user.id,
      proyectoId: projectId,
      nombre: nombreProyecto,
      objetivo,
      fechaLimite,
      importancia,
      nivel,
      tiempoDiario,
      bloquesLibresPorDia: bloquesDisponibilidadTexto,
      textoExtraidoArchivos: textoAdjuntos || undefined,
      enlaces: inputData.enlaces,
    });

    // 5. Desactivar cronogramas anteriores para este proyecto
    await supabase
      .from('cronogramas')
      .update({ activo: false, estado: 'archivado', updated_at: new Date().toISOString() })
      .eq('proyecto_id', projectId)
      .eq('activo', true);

    // 6. Obtener versión siguiente
    const { data: prevCron } = await supabase
      .from('cronogramas')
      .select('version')
      .eq('proyecto_id', projectId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = prevCron && prevCron.length > 0 ? prevCron[0].version + 1 : 1;

    // 7. Guardar nuevo cronograma activo
    const { data: newCronograma, error: insertCronErr } = await supabase
      .from('cronogramas')
      .insert({
        proyecto_id: projectId,
        usuario_id: user.id,
        version: nextVersion,
        datos: scheduleResult,
        activo: true,
        estado: 'vigente',
      })
      .select()
      .single();

    if (insertCronErr) {
      console.error('Error insertando cronograma:', insertCronErr);
      return NextResponse.json(
        { success: false, error: 'Error al persistir cronograma en la base de datos.' },
        { status: 500 },
      );
    }

    // 8. Sincronizar bloques en la tabla eventos_calendario
    if (scheduleResult.bloques && scheduleResult.bloques.length > 0) {
      // Borrar eventos previos del proyecto no completados generados por IA
      await supabase
        .from('eventos_calendario')
        .delete()
        .eq('proyecto_id', projectId)
        .eq('generado_por_ia', true)
        .eq('estado', 'pendiente');

      const eventosToInsert = scheduleResult.bloques.map((b) => ({
        usuario_id: user.id,
        proyecto_id: projectId,
        titulo: b.tarea,
        descripcion: b.descripcion || '',
        inicio: new Date(`${b.fecha}T${b.hora_inicio}:00Z`).toISOString(),
        fin: new Date(`${b.fecha}T${b.hora_fin}:00Z`).toISOString(),
        estado: 'pendiente' as const,
        generado_por_ia: true,
      }));

      await supabase.from('eventos_calendario').insert(eventosToInsert);
    }

    return NextResponse.json({
      success: true,
      data: {
        cronogramaId: newCronograma.id,
        version: nextVersion,
        cronograma: scheduleResult,
      },
    });
  } catch (error) {
    console.error('Error en POST /api/projects/:id/generate-schedule:', error);
    const msg = error instanceof Error ? error.message : 'Error interno al generar cronograma';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
