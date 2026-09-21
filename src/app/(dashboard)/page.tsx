import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  evaluateAndSyncUserStreak,
  getCaracasDateKey,
  isTaskForDate,
} from '@/features/gamification/services/streakService';
import { HomeTaskItem } from '@/features/tasks/components/HomeTaskList';
import { HomeProjectItem } from '@/features/proyectos/components/HomeActiveProjects';
import { HomeDashboardClient } from '@/features/dashboard/components/HomeDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Komorebi | Sistema de Gestión de Calendarios con Google OAuth',
  description:
    'Komorebi es una aplicación y sistema de gestión de calendarios con Google OAuth diseñada para sincronizar eventos, gestionar sesiones de estudio y elevar la productividad académica.',
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Evaluar y sincronizar racha del usuario
  const streakResult = await evaluateAndSyncUserStreak(supabase, user.id);

  // 2. Obtener proyectos del usuario desde la tabla 'projects'
  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id);

  if (projectsError) {
    console.error('Error al obtener projects en HomePage:', projectsError);
  }

  const rawProjects = projectsData ?? [];
  const projectIds = rawProjects.map((p) => p.id);

  // 3. Obtener todas las tareas de los proyectos del usuario desde la tabla 'tareas'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawTasks: any[] = [];
  if (projectIds.length > 0) {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tareas')
      .select('*')
      .in('id_proyecto', projectIds);

    if (tasksError) {
      console.error('Error al obtener tareas en HomePage:', tasksError);
    }
    rawTasks = tasksData ?? [];
  }

  // 4. Nombre de usuario para el saludo
  const displayName =
    user.user_metadata?.first_name ||
    user.user_metadata?.username ||
    user.user_metadata?.nombre_usuario ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Estudiante';

  // 5. Saludo horario y fecha en español en zona horaria local (America/Caracas)
  const now = new Date();
  const caracasHour = parseInt(
    new Intl.DateTimeFormat('es-VE', {
      timeZone: 'America/Caracas',
      hour: 'numeric',
      hour12: false,
    }).format(now),
    10,
  );

  let saludo = '¡Buenos días';
  if (caracasHour >= 12 && caracasHour < 19) {
    saludo = '¡Buenas tardes';
  } else if (caracasHour >= 19 || caracasHour < 5) {
    saludo = '¡Buenas noches';
  }

  const formattedDate = new Intl.DateTimeFormat('es-VE', {
    timeZone: 'America/Caracas',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const todayKey = getCaracasDateKey(now);

  const projectMap = new Map(rawProjects.map((p) => [p.id, p]));

  // 6. Proyectos activos (no completados)
  const activeProjectsRaw = rawProjects.filter((p) => !p.completado && p.status !== 'completed');
  const activeProjects: HomeProjectItem[] = activeProjectsRaw.map((p) => {
    const pTasks = rawTasks.filter((t) => t.id_proyecto === p.id);
    const tCount = pTasks.length;
    const cCount = pTasks.filter((t) => t.completado).length;
    const calcProgress = tCount === 0 ? p.progreso || 0 : Math.round((cCount / tCount) * 100);

    return {
      id: p.id,
      titulo: p.titulo || p.name || 'Proyecto sin título',
      prioridad: p.prioridad || 'Normal',
      progreso: calcProgress,
      completedTasks: cCount,
      totalTasks: tCount,
      fecha_limite: p.fecha_limite,
    };
  });

  // 7. Tareas por completar en el día actual
  const todayScheduledTasks = rawTasks.filter((t) => {
    if (!t.fecha_inicio) return false;
    return isTaskForDate(t.fecha_inicio, todayKey);
  });

  // Ordenar tareas de hoy cronológicamente
  todayScheduledTasks.sort((a, b) => {
    const timeA = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0;
    const timeB = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0;
    return timeA - timeB;
  });

  // Si no hay tareas con horario fijado para hoy, mostrar tareas pendientes de proyectos activos
  const activeProjectIds = new Set(activeProjectsRaw.map((p) => p.id));
  const candidateTasks =
    todayScheduledTasks.length > 0
      ? todayScheduledTasks
      : rawTasks
          .filter((t) => activeProjectIds.has(t.id_proyecto) && !t.completado)
          .slice(0, 6);

  const homeTasks: HomeTaskItem[] = candidateTasks.map((t) => ({
    id: t.id,
    id_proyecto: t.id_proyecto,
    titulo: t.titulo || 'Tarea sin título',
    descripcion: t.descripcion,
    duracion: Number(t.duracion) || 30,
    completado: Boolean(t.completado),
    fecha_inicio: t.fecha_inicio,
    prioridad: t.prioridad,
    resources: t.resources,
    url_recomendada: t.url_recomendada,
    projectName:
      projectMap.get(t.id_proyecto)?.titulo ||
      projectMap.get(t.id_proyecto)?.name ||
      'Proyecto',
  }));

  // 8. Cálculo de métricas:
  // a) Esta semana
  const mondayDate = new Date(now);
  const dayOffset = (mondayDate.getDay() + 6) % 7;
  mondayDate.setDate(mondayDate.getDate() - dayOffset);
  mondayDate.setHours(0, 0, 0, 0);

  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(sundayDate.getDate() + 6);
  sundayDate.setHours(23, 59, 59, 999);

  const thisWeekTasks = rawTasks.filter((t) => {
    if (!t.fecha_inicio) return false;
    const taskDate = new Date(t.fecha_inicio);
    return taskDate >= mondayDate && taskDate <= sundayDate;
  });

  const weeklyMinutes =
    thisWeekTasks.length > 0
      ? thisWeekTasks.reduce((acc, t) => acc + (Number(t.duracion) || 30), 0)
      : rawTasks.reduce((acc, t) => acc + (Number(t.duracion) || 30), 0);

  const dailyTargetTotal = rawProjects.reduce(
    (acc, p) => acc + (Number(p.minutos_diarios) || 0),
    0,
  );
  const weeklyTargetMinutes = dailyTargetTotal > 0 ? dailyTargetTotal * 7 : 600;
  const weeklyProgressPercent = Math.min(
    100,
    Math.round((weeklyMinutes / weeklyTargetMinutes) * 100),
  );

  // b) Progreso hoy
  let todayDisplayTotal = todayScheduledTasks.length;
  let todayDisplayCompleted = todayScheduledTasks.filter((t) => t.completado).length;

  if (todayDisplayTotal === 0) {
    const completedToday = rawTasks.filter((t) => {
      if (!t.completado) return false;
      const d = t.completed_at || t.fecha_inicio;
      return isTaskForDate(d, todayKey);
    }).length;
    todayDisplayCompleted = completedToday;
    todayDisplayTotal = Math.max(completedToday, candidateTasks.length);
  }

  // c) Ritmo Global
  const totalTasksCount = rawTasks.length;
  const completedTasksCount = rawTasks.filter((t) => t.completado).length;
  const globalProgress =
    totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100);

  return (
    <HomeDashboardClient
      userData={{
        displayName,
        saludo,
        displayDate,
      }}
      initialMetrics={{
        rachaActiva: streakResult.racha_activa,
        rachaMaxima: streakResult.racha_maxima,
        weeklyMinutes,
        weeklyTargetMinutes,
        weeklyProgressPercent,
        todayCompleted: todayDisplayCompleted,
        todayTotal: todayDisplayTotal,
        globalProgress,
        totalTasksCount,
        completedTasksCount,
      }}
      initialTasks={homeTasks}
      initialProjects={activeProjects}
    />
  );
}
