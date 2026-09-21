import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  updateAvailabilityRequestSchema,
  ScheduleBlock,
} from '@/features/schedule/types/scheduleSchemas';
import {
  detectScheduleConflicts,
  shouldThrottleRegeneration,
} from '@/services/schedule/conflictDetector';
import { regenerateScheduleWithGemini } from '@/services/ai/scheduleAiService';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: Params) {
  const { id: targetUserId } = await context.params;

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

    if (user.id !== targetUserId) {
      return NextResponse.json(
        { success: false, error: 'No tienes autorización para modificar la disponibilidad de este usuario.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updateAvailabilityRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de solicitud inválido.',
          details: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { cambios, proyecto_id, fecha_limite_proyecto, forzar_regeneracion } = parsed.data;

    // 1. Guardar o eliminar cambios en la tabla bloques_disponibilidad
    for (const cambio of cambios) {
      if (cambio.accion === 'eliminar') {
        let deleteQuery = supabase
          .from('bloques_disponibilidad')
          .delete()
          .eq('usuario_id', user.id)
          .eq('hora_inicio', cambio.hora_inicio)
          .eq('hora_fin', cambio.hora_fin);

        if (cambio.fecha_especifica) {
          deleteQuery = deleteQuery.eq('fecha_especifica', cambio.fecha_especifica);
        } else if (cambio.dia_semana !== undefined && cambio.dia_semana !== null) {
          deleteQuery = deleteQuery.eq('dia_semana', cambio.dia_semana);
        }
        await deleteQuery;
      } else {
        // Insertar o actualizar bloque
        await supabase.from('bloques_disponibilidad').insert({
          usuario_id: user.id,
          dia_semana: cambio.dia_semana ?? null,
          fecha_especifica: cambio.fecha_especifica ?? null,
          hora_inicio: cambio.hora_inicio,
          hora_fin: cambio.hora_fin,
          tipo: cambio.tipo,
          origen: cambio.origen,
        });
      }
    }

    // 2. Si se envió una nueva fecha límite de proyecto, actualizarla
    if (proyecto_id && fecha_limite_proyecto) {
      await supabase
        .from('projects')
        .update({
          fecha_limite: new Date(`${fecha_limite_proyecto}T00:00:00Z`).toISOString(),
        })
        .eq('id', proyecto_id)
        .eq('user_id', user.id);
    }

    // 3. Detectar si el cambio afecta cronogramas activos
    const conflictResult = await detectScheduleConflicts(user.id, proyecto_id);

    // 4. Si hay conflicto o forzar_regeneracion = true, evaluar si se debe regenerar
    let regenerado = false;
    let nuevoCronograma = null;
    let throttleBloqueado = false;

    if (conflictResult.hasConflict || forzar_regeneracion) {
      // Verificar rate-limiting para no saturar con llamadas a Gemini en spam
      const throttled = await shouldThrottleRegeneration(user.id, 2);
      if (throttled && !forzar_regeneracion) {
        throttleBloqueado = true;
      } else {
        // Obtener proyectos a regenerar
        let projQuery = supabase
          .from('projects')
          .select('id, titulo, objetivo, fecha_limite')
          .eq('user_id', user.id)
          .eq('completado', false);

        if (proyecto_id) {
          projQuery = projQuery.eq('id', proyecto_id);
        }

        const { data: affectedProjects } = await projQuery;

        if (affectedProjects && affectedProjects.length > 0) {
          const targetProj = affectedProjects[0];

          // Obtener cronograma activo actual
          const { data: currentCronData } = await supabase
            .from('cronogramas')
            .select('id, version, datos')
            .eq('proyecto_id', targetProj.id)
            .eq('activo', true)
            .single();

          const todayStr = new Date().toISOString().split('T')[0];
          const currentBlocks = (currentCronData?.datos as { bloques?: ScheduleBlock[] })?.bloques || [];
          const bloquesFuturos = currentBlocks.filter((b) => b.fecha >= todayStr);

          // Obtener tareas ya completadas del proyecto
          const { data: completedTasks } = await supabase
            .from('tareas')
            .select('titulo, duracion, completed_at')
            .eq('id_proyecto', targetProj.id)
            .eq('completado', true);

          const completedText = (completedTasks || [])
            .map((t) => `- ${t.titulo} (${t.duracion || 30} min)`)
            .join('\n');

          const cambiosTexto = cambios
            .map(
              (c) =>
                `- ${c.accion.toUpperCase()}: ${c.tipo} de ${c.hora_inicio} a ${c.hora_fin} ${
                  c.fecha_especifica ? `en fecha ${c.fecha_especifica}` : `los días ${c.dia_semana}`
                }`,
            )
            .join('\n');

          const bloquesFuturosTexto = bloquesFuturos
            .map((b) => `- ${b.fecha} ${b.hora_inicio}-${b.hora_fin}: ${b.tarea} (${b.descripcion})`)
            .join('\n');

          // Invocar a Gemini para regenerar
          const scheduleResult = await regenerateScheduleWithGemini({
            usuarioId: user.id,
            proyectoId: targetProj.id,
            nombre: targetProj.titulo,
            fechaLimite: fecha_limite_proyecto || (targetProj.fecha_limite ? targetProj.fecha_limite.split('T')[0] : undefined),
            cambiosDisponibilidad: cambiosTexto,
            bloquesFuturosActuales: bloquesFuturosTexto,
            tareasCompletadas: completedText,
          });

          // Incrementar versión y marcar anterior como activo = false
          const nextVersion = (currentCronData?.version || 1) + 1;

          if (currentCronData?.id) {
            await supabase
              .from('cronogramas')
              .update({ activo: false, estado: 'archivado', updated_at: new Date().toISOString() })
              .eq('id', currentCronData.id);
          }

          const { data: insertedCron } = await supabase
            .from('cronogramas')
            .insert({
              proyecto_id: targetProj.id,
              usuario_id: user.id,
              version: nextVersion,
              datos: scheduleResult,
              activo: true,
              estado: 'vigente',
            })
            .select()
            .single();

          // Sincronizar eventos_calendario (reemplazando eventos futuros pendientes)
          await supabase
            .from('eventos_calendario')
            .delete()
            .eq('proyecto_id', targetProj.id)
            .eq('generado_por_ia', true)
            .eq('estado', 'pendiente')
            .gte('inicio', `${todayStr}T00:00:00Z`);

          if (scheduleResult.bloques && scheduleResult.bloques.length > 0) {
            const nuevosEventos = scheduleResult.bloques.map((b) => ({
              usuario_id: user.id,
              proyecto_id: targetProj.id,
              titulo: b.tarea,
              descripcion: b.descripcion || '',
              inicio: new Date(`${b.fecha}T${b.hora_inicio}:00Z`).toISOString(),
              fin: new Date(`${b.fecha}T${b.hora_fin}:00Z`).toISOString(),
              estado: 'pendiente' as const,
              generado_por_ia: true,
            }));

            await supabase.from('eventos_calendario').insert(nuevosEventos);
          }

          regenerado = true;
          nuevoCronograma = {
            id: insertedCron?.id,
            version: nextVersion,
            datos: scheduleResult,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        cambiosAplicados: cambios.length,
        tieneConflictos: conflictResult.hasConflict,
        conflictos: conflictResult.conflicts,
        cronogramaRegenerado: regenerado,
        throttleBloqueado,
        cronograma: nuevoCronograma,
      },
    });
  } catch (error) {
    console.error('Error en PATCH /api/users/:id/availability:', error);
    const msg = error instanceof Error ? error.message : 'Error interno al actualizar disponibilidad';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
