import type { SupabaseClient } from '@supabase/supabase-js';

export interface TaskTimeRecord {
  id: string;
  id_proyecto: string;
  titulo?: string;
  fecha_inicio?: string | null;
  duracion?: number | null; // duración en minutos
  completado?: boolean | null;
}

export interface StreakEvaluationResult {
  racha_activa: number;
  racha_maxima: number;
  hasOverdueTasks: boolean;
  overdueCount: number;
  wasReset: boolean;
}

/**
 * Calcula si una tarea individual está vencida respecto al momento actual.
 * Una tarea se considera vencida si tiene fecha_inicio programada, duracion,
 * NO está completada, y la hora actual supera (fecha_inicio + duracion).
 */
export function isTaskOverdue(
  task: {
    fecha_inicio?: string | null;
    duracion?: number | null;
    completado?: boolean | null;
  },
  referenceTime = Date.now(),
): boolean {
  if (task.completado) return false;
  if (!task.fecha_inicio) return false;

  const startTime = new Date(task.fecha_inicio).getTime();
  if (Number.isNaN(startTime)) return false;

  const durationMinutes = Math.max(1, Number(task.duracion) || 0);
  const endTime = startTime + durationMinutes * 60 * 1000;

  return referenceTime > endTime;
}

/**
 * Determina el estado temporal de una tarea para su renderizado visual:
 * - 'completed': Ya se marcó como completada
 * - 'overdue': No se completó a tiempo y su ventana ya expiró
 * - 'in_progress': Estamos actualmente dentro de la ventana de la tarea
 * - 'upcoming': La tarea iniciará en el futuro
 * - 'flexible': No tiene hora de inicio específica fijada
 */
export function getTaskTimeStatus(
  task: {
    fecha_inicio?: string | null;
    duracion?: number | null;
    completado?: boolean | null;
  },
  referenceTime = Date.now(),
): 'completed' | 'overdue' | 'in_progress' | 'upcoming' | 'flexible' {
  if (task.completado) return 'completed';
  if (!task.fecha_inicio) return 'flexible';

  const startTime = new Date(task.fecha_inicio).getTime();
  if (Number.isNaN(startTime)) return 'flexible';

  const durationMinutes = Math.max(1, Number(task.duracion) || 0);
  const endTime = startTime + durationMinutes * 60 * 1000;

  if (referenceTime > endTime) return 'overdue';
  if (referenceTime >= startTime && referenceTime <= endTime) return 'in_progress';
  return 'upcoming';
}

/**
 * Devuelve la clave de fecha YYYY-MM-DD en zona horaria America/Caracas.
 */
export function getCaracasDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Obtiene la fecha YYYY-MM-DD en America/Caracas para una fecha_inicio de tarea.
 */
export function getTaskCaracasDate(fechaInicio?: string | null): string | null {
  if (!fechaInicio) return null;
  const parsed = new Date(fechaInicio);
  if (Number.isNaN(parsed.getTime())) return fechaInicio.slice(0, 10);
  return getCaracasDateKey(parsed);
}

/**
 * Comprueba si una tarea está programada para una fecha dada (YYYY-MM-DD),
 * considerando coincidencia de texto, hora local de Caracas y formato UTC.
 */
export function isTaskForDate(fechaInicio: string | null | undefined, dateKey: string): boolean {
  if (!fechaInicio) return false;
  if (fechaInicio.startsWith(dateKey)) return true;
  const caracasDate = getTaskCaracasDate(fechaInicio);
  if (caracasDate === dateKey) return true;
  try {
    const d = new Date(fechaInicio);
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateKey) {
      return true;
    }
  } catch {
    // ignorar error de formato
  }
  return false;
}

/**
 * Evalúa las tareas del usuario en Supabase y sincroniza la racha:
 * Si el usuario tiene tareas programadas para hoy cuya ventana expiró sin completarse
 * (ejemplo: tarea a las 10:00 con duración de 15 min, y son las 10:16),
 * la racha_activa se reinicia a 0 en profiles y se devuelve 0.
 */
export async function evaluateAndSyncUserStreak(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<StreakEvaluationResult> {
  try {
    // 1. Obtener datos actuales de racha en profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('racha_activa, racha_maxima')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error al obtener perfil para evaluar racha:', profileError);
    }

    const currentStreak = typeof profile?.racha_activa === 'number' ? profile.racha_activa : 0;
    const maxStreak = typeof profile?.racha_maxima === 'number' ? profile.racha_maxima : 0;

    // 2. Obtener los proyectos del usuario
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    if (projectsError || !projects || projects.length === 0) {
      // Si el usuario no tiene proyectos, no puede tener racha activa
      if (currentStreak > 0) {
        const newMax = maxStreak <= 1 ? 0 : maxStreak;
        await supabase
          .from('profiles')
          .update({ racha_activa: 0, racha_maxima: newMax })
          .eq('id', userId);

        return {
          racha_activa: 0,
          racha_maxima: newMax,
          hasOverdueTasks: false,
          overdueCount: 0,
          wasReset: true,
        };
      }

      return {
        racha_activa: 0,
        racha_maxima: maxStreak <= 1 && currentStreak === 0 ? 0 : maxStreak,
        hasOverdueTasks: false,
        overdueCount: 0,
        wasReset: false,
      };
    }

    const projectIds = projects.map((p) => p.id);

    // 3. Obtener todas las tareas de los proyectos del usuario
    const { data: allTasks, error: tasksError } = await supabase
      .from('tareas')
      .select('id, id_proyecto, titulo, fecha_inicio, duracion, completado')
      .in('id_proyecto', projectIds);

    if (tasksError) {
      console.error('Error al obtener tareas para evaluar racha:', tasksError);
      return {
        racha_activa: currentStreak,
        racha_maxima: maxStreak,
        hasOverdueTasks: false,
        overdueCount: 0,
        wasReset: false,
      };
    }

    const taskList = allTasks ?? [];
    const completedCount = taskList.filter((t) => Boolean(t.completado)).length;

    // Regla de consistencia: si no hay tareas completadas en ningún proyecto, la racha activa DEBE ser 0
    if (completedCount === 0) {
      if (currentStreak > 0) {
        const newMax = maxStreak <= 1 ? 0 : maxStreak;
        await supabase
          .from('profiles')
          .update({ racha_activa: 0, racha_maxima: newMax })
          .eq('id', userId);

        return {
          racha_activa: 0,
          racha_maxima: newMax,
          hasOverdueTasks: false,
          overdueCount: 0,
          wasReset: true,
        };
      }

      return {
        racha_activa: 0,
        racha_maxima: maxStreak <= 1 ? 0 : maxStreak,
        hasOverdueTasks: false,
        overdueCount: 0,
        wasReset: false,
      };
    }

    // Si la racha activa supera el número de tareas completadas disponibles (por ejemplo tras borrar tareas),
    // ajustamos la racha al límite real de tareas completadas
    let effectiveStreak = currentStreak;
    if (currentStreak > completedCount) {
      effectiveStreak = completedCount;
      await supabase.from('profiles').update({ racha_activa: effectiveStreak }).eq('id', userId);
    }

    const now = Date.now();
    const todayKey = getCaracasDateKey(new Date(now));

    // Considerar tareas de hoy que ya vencieron en el horario establecido sin completarse
    const overdueTasks = taskList.filter((task) => {
      if (task.completado || !task.fecha_inicio) return false;
      const isToday = isTaskForDate(task.fecha_inicio, todayKey);
      if (!isToday) return false;
      return isTaskOverdue(task, now);
    });

    const hasOverdue = overdueTasks.length > 0;

    // 4. Si hay una tarea no completada en el plazo establecido, reiniciar la racha a 0
    if (hasOverdue) {
      if (effectiveStreak > 0) {
        await supabase.from('profiles').update({ racha_activa: 0 }).eq('id', userId);
      }

      return {
        racha_activa: 0,
        racha_maxima: maxStreak,
        hasOverdueTasks: true,
        overdueCount: overdueTasks.length,
        wasReset: effectiveStreak > 0,
      };
    }

    return {
      racha_activa: effectiveStreak,
      racha_maxima: maxStreak,
      hasOverdueTasks: false,
      overdueCount: 0,
      wasReset: false,
    };
  } catch (error) {
    console.error('Error inesperado en evaluateAndSyncUserStreak:', error);
    return {
      racha_activa: 0,
      racha_maxima: 0,
      hasOverdueTasks: false,
      overdueCount: 0,
      wasReset: false,
    };
  }
}
