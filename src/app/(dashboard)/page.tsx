import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HomeDashboardClient } from './HomeDashboardClient';

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('racha_activa, racha_maxima')
    .eq('id', user.id)
    .maybeSingle();

  const rachaActiva = typeof profile?.racha_activa === 'number' ? profile.racha_activa : 0;

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
  
  if (projects && projects.length > 0) {
    const projectIds = projects.map(p => p.id);
    
    // Obtener total de tareas pendientes
    const { count } = await supabase
      .from('tareas')
      .select('*', { count: 'exact', head: true })
      .in('id_proyecto', projectIds)
      .eq('completado', false);
      
    totalPendingTasks = count || 0;
    
    const { data: tareas } = await supabase
      .from('tareas')
      .select('id, titulo, duracion, prioridad, fecha_inicio, id_proyecto')
      .in('id_proyecto', projectIds)
      .eq('completado', false)
      .order('fecha_inicio', { ascending: true, nullsFirst: false })
      .limit(3);

    if (tareas) {
      upcomingTasks = tareas.map(t => {
        const project = projects.find(p => p.id === t.id_proyecto);
        return {
          id: t.id,
          titulo: t.titulo,
          duracion: t.duracion,
          prioridad: t.prioridad,
          fecha_inicio: t.fecha_inicio,
          project_titulo: project?.titulo || null,
        };
      });
    }
  }

  return <HomeDashboardClient displayName={displayName} rachaActiva={rachaActiva} upcomingTasks={upcomingTasks} totalPendingTasks={totalPendingTasks} />;
}
