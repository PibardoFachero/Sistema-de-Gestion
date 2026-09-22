import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { evaluateAndSyncUserStreak } from '@/features/gamification/services/streakService';
import { HomeDashboardClient } from './HomeDashboardClient';

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

  // Evaluar y sincronizar racha del usuario
  const streakResult = await evaluateAndSyncUserStreak(supabase, user.id);
  const rachaActiva = streakResult.racha_activa;

  const displayName =
    user.user_metadata?.first_name ||
    user.user_metadata?.username ||
    user.user_metadata?.nombre_usuario ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Estudiante';

  // Obtener proyectos del usuario para luego buscar sus tareas pendientes
  const { data: projects } = await supabase
    .from('projects')
    .select('id, titulo')
    .eq('user_id', user.id);

  let upcomingTasks: import('./HomeDashboardClient').UpcomingTask[] = [];
  let totalPendingTasks = 0;

  // Métricas por defecto
  const metrics = {
    weeklyHoursText: '0h 0m',
    chartData: [
      { day: 'L', value: 0 },
      { day: 'M', value: 0 },
      { day: 'X', value: 0 },
      { day: 'J', value: 0 },
      { day: 'V', value: 0 },
      { day: 'S', value: 0 },
      { day: 'D', value: 0 },
    ],
    todayCompleted: 0,
    todayTotal: 0,
    globalPace: 0,
  };

  if (projects && projects.length > 0) {
    const projectIds = projects.map((p) => p.id);

    // Obtener TODAS las tareas para calcular métricas
    const { data: allTareas } = await supabase
      .from('tareas')
      .select('id, titulo, duracion, prioridad, fecha_inicio, id_proyecto, completado, completed_at')
      .in('id_proyecto', projectIds);

    if (allTareas) {
      // 1. upcomingTasks (limit 3, pending)
      const pendingTareas = allTareas
        .filter((t) => !t.completado)
        .sort((a, b) => {
          if (!a.fecha_inicio) return 1;
          if (!b.fecha_inicio) return -1;
          return new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime();
        });

      totalPendingTasks = pendingTareas.length;

      upcomingTasks = pendingTareas.slice(0, 3).map((t) => {
        const project = projects.find((p) => p.id === t.id_proyecto);
        return {
          id: t.id,
          titulo: t.titulo,
          duracion: t.duracion,
          prioridad: t.prioridad,
          fecha_inicio: t.fecha_inicio,
          project_titulo: project?.titulo || null,
          id_proyecto: t.id_proyecto,
        };
      });

      // 2. Cálculos de métricas
      const now = new Date();
      const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 for Monday, 6 for Sunday
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      let weeklyMinutes = 0;
      let totalCompletedTasks = 0;
      const chartMap: Record<string, number> = { L: 0, M: 0, X: 0, J: 0, V: 0, S: 0, D: 0 };
      const keys = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

      for (const t of allTareas) {
        if (t.completado) totalCompletedTasks++;

        // Esta semana
        if (t.completado && t.completed_at) {
          const compDate = new Date(t.completed_at);
          if (compDate >= weekStart && compDate <= weekEnd) {
            const mins = t.duracion || 0;
            weeklyMinutes += mins;
            chartMap[keys[compDate.getDay()]] += mins;
          }
        }

        // Progreso hoy
        if (t.fecha_inicio) {
          const startDate = new Date(t.fecha_inicio);
          if (startDate >= todayStart && startDate <= todayEnd) {
            metrics.todayTotal++;
            if (t.completado) metrics.todayCompleted++;
          }
        }
      }

      metrics.weeklyHoursText = `${Math.floor(weeklyMinutes / 60)}h ${weeklyMinutes % 60}m`;
      metrics.chartData = [
        { day: 'L', value: chartMap['L'] },
        { day: 'M', value: chartMap['M'] },
        { day: 'X', value: chartMap['X'] },
        { day: 'J', value: chartMap['J'] },
        { day: 'V', value: chartMap['V'] },
        { day: 'S', value: chartMap['S'] },
        { day: 'D', value: chartMap['D'] },
      ];
      metrics.globalPace =
        allTareas.length > 0 ? Math.round((totalCompletedTasks / allTareas.length) * 100) : 0;
    }
  }

  return (
    <HomeDashboardClient
      displayName={displayName}
      rachaActiva={rachaActiva}
      upcomingTasks={upcomingTasks}
      totalPendingTasks={totalPendingTasks}
      metrics={metrics}
    />
  );
}
