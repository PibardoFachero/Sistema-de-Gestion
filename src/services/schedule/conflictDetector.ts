import { createClient } from '@/lib/supabase/server';
import { ScheduleBlock } from '@/features/schedule/types/scheduleSchemas';

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    bloqueCronograma: ScheduleBlock;
    bloqueOcupado: {
      dia_semana?: number | null;
      fecha_especifica?: string | null;
      hora_inicio: string;
      hora_fin: string;
      tipo: string;
    };
    motivo: string;
  }>;
}

/**
 * Convierte una hora 'HH:MM' a minutos desde las 00:00
 */
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Evalúa si dos intervalos de tiempo se solapan
 */
function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Comprueba si el usuario tiene una regeneración muy reciente (throttling para evitar spam)
 * Máximo 1 regeneración cada 2 minutos por usuario.
 */
export async function shouldThrottleRegeneration(
  usuarioId: string,
  cooldownMinutes = 2,
): Promise<boolean> {
  const supabase = await createClient();
  const cooldownAgo = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('logs_ia')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('tipo_operacion', 'regeneracion_cronograma')
    .gte('creado_en', cooldownAgo)
    .limit(1);

  return Boolean(data && data.length > 0);
}

/**
 * Compara los bloques del cronograma activo vs los bloques de disponibilidad ocupados del usuario.
 * Si encuentra intersección, marca el cronograma activo como 'desactualizado'.
 */
export async function detectScheduleConflicts(
  usuarioId: string,
  proyectoId?: string,
): Promise<ConflictResult> {
  const supabase = await createClient();

  // 1. Obtener cronograma(s) activo(s)
  let cronogramaQuery = supabase
    .from('cronogramas')
    .select('id, proyecto_id, datos, activo')
    .eq('usuario_id', usuarioId)
    .eq('activo', true);

  if (proyectoId) {
    cronogramaQuery = cronogramaQuery.eq('proyecto_id', proyectoId);
  }

  const { data: cronogramas, error: cronErr } = await cronogramaQuery;
  if (cronErr || !cronogramas || cronogramas.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  // 2. Obtener bloques de disponibilidad donde el usuario esté ocupado
  const { data: busyBlocks, error: busyErr } = await supabase
    .from('bloques_disponibilidad')
    .select('*')
    .eq('usuario_id', usuarioId)
    .neq('tipo', 'tareas');

  if (busyErr || !busyBlocks || busyBlocks.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const conflicts: ConflictResult['conflicts'] = [];
  const outdatedScheduleIds: string[] = [];

  for (const cron of cronogramas) {
    const datos = cron.datos as { bloques?: ScheduleBlock[] };
    const bloques = datos?.bloques || [];
    let cronogramaTieneConflicto = false;

    // Solo evaluar bloques futuros o de hoy
    const futureBlocks = bloques.filter((b) => b.fecha >= todayStr);

    for (const b of futureBlocks) {
      const bDate = new Date(`${b.fecha}T00:00:00Z`);
      const bDayOfWeek = bDate.getUTCDay(); // 0 a 6
      const bStartMin = timeToMinutes(b.hora_inicio);
      const bEndMin = timeToMinutes(b.hora_fin);

      for (const busy of busyBlocks) {
        let matchesDay = false;
        if (busy.fecha_especifica) {
          matchesDay = busy.fecha_especifica === b.fecha;
        } else if (busy.dia_semana !== null && busy.dia_semana !== undefined) {
          matchesDay = busy.dia_semana === bDayOfWeek;
        }

        if (matchesDay) {
          const busyStartMin = timeToMinutes(busy.hora_inicio);
          const busyEndMin = timeToMinutes(busy.hora_fin);

          if (intervalsOverlap(bStartMin, bEndMin, busyStartMin, busyEndMin)) {
            cronogramaTieneConflicto = true;
            conflicts.push({
              bloqueCronograma: b,
              bloqueOcupado: busy,
              motivo: `Solapamiento con bloque ocupado (${busy.tipo}) de ${busy.hora_inicio} a ${busy.hora_fin}`,
            });
          }
        }
      }
    }

    if (cronogramaTieneConflicto) {
      outdatedScheduleIds.push(cron.id);
    }
  }

  // Si hay cronogramas en conflicto, marcarlos como 'desactualizado'
  if (outdatedScheduleIds.length > 0) {
    await supabase
      .from('cronogramas')
      .update({ estado: 'desactualizado', updated_at: new Date().toISOString() })
      .in('id', outdatedScheduleIds);
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
