'use server';

import { createClient } from '@/lib/supabase/server';
import { CreateProjectWithMilestonesInput, LinkedProject, ProjectOption } from '../types';

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getUserProjectsAction(
  topicId?: string,
): Promise<ActionResponse<ProjectOption[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // 1. Proyectos del usuario
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (projectsError) {
      return { success: false, error: projectsError.message };
    }

    if (!projects || projects.length === 0) {
      return { success: true, data: [] };
    }

    const projectIds = projects.map((p) => p.id);

    // 2. Hitos para calcular progreso real
    const { data: milestones } = await supabase
      .from('project_milestones')
      .select('*')
      .in('project_id', projectIds);

    const statsMap: Record<string, { total: number; completed: number }> = {};
    (milestones || []).forEach((m) => {
      if (!statsMap[m.project_id]) {
        statsMap[m.project_id] = { total: 0, completed: 0 };
      }
      statsMap[m.project_id].total += 1;
      if (m.is_completed) {
        statsMap[m.project_id].completed += 1;
      }
    });

    // 3. Proyectos ya vinculados al topicId (si se proporciona)
    const linkedProjectIds = new Set<string>();
    if (topicId) {
      const { data: linked } = await supabase
        .from('topic_projects')
        .select('project_id')
        .eq('topic_id', topicId)
        .eq('user_id', user.id);

      if (linked) {
        linked.forEach((item) => linkedProjectIds.add(item.project_id));
      }
    }

    const result: ProjectOption[] = projects.map((p) => {
      const stats = statsMap[p.id] || { total: 0, completed: 0 };
      const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        status: p.status || 'active',
        progress,
        totalMilestones: stats.total,
        completedMilestones: stats.completed,
        isLinked: linkedProjectIds.has(p.id),
      };
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener proyectos',
    };
  }
}

export async function linkProjectAction(
  topicId: string,
  projectId: string,
): Promise<ActionResponse<LinkedProject>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // Vincular en topic_projects
    const { error: insertError } = await supabase.from('topic_projects').insert({
      topic_id: topicId,
      project_id: projectId,
      user_id: user.id,
    });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Obtener detalles del proyecto y sus hitos para calcular progreso
    const { data: project, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (pError || !project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    const { data: milestones } = await supabase
      .from('project_milestones')
      .select('is_completed')
      .eq('project_id', projectId);

    const totalMilestones = milestones?.length || 0;
    const completedMilestones = milestones?.filter((m) => m.is_completed).length || 0;
    const progress =
      totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const linkedProject: LinkedProject = {
      id: project.id,
      name: project.name,
      description: project.description || '',
      detail: project.status === 'active' ? 'Proyecto activo' : 'Proyecto en planificación',
      status: project.status,
      progress,
      totalMilestones,
      completedMilestones,
    };

    return { success: true, data: linkedProject };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al vincular el proyecto',
    };
  }
}

export async function unlinkProjectAction(
  topicId: string,
  projectId: string,
): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    const { error } = await supabase
      .from('topic_projects')
      .delete()
      .eq('topic_id', topicId)
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al desvincular el proyecto',
    };
  }
}

export async function createProjectWithMilestonesAction(
  input: CreateProjectWithMilestonesInput,
  topicIdToLink?: string,
): Promise<ActionResponse<LinkedProject>> {
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: 'El nombre del proyecto es obligatorio.' };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // 1. Crear proyecto
    const { data: project, error: pError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description: input.description?.trim() || '',
        status: 'active',
      })
      .select()
      .single();

    if (pError || !project) {
      return { success: false, error: pError?.message || 'Error al crear proyecto' };
    }

    // 2. Crear hitos si existen
    const cleanMilestones = (input.milestones || [])
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    const completedCount = 0;
    if (cleanMilestones.length > 0) {
      const milestoneRows = cleanMilestones.map((title) => ({
        project_id: project.id,
        user_id: user.id,
        title,
        is_completed: false,
      }));

      await supabase.from('project_milestones').insert(milestoneRows);
    }

    // 3. Vincular al tema si se solicitó
    if (topicIdToLink) {
      await supabase.from('topic_projects').insert({
        topic_id: topicIdToLink,
        project_id: project.id,
        user_id: user.id,
      });
    }

    const totalMilestones = cleanMilestones.length;
    const progress = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;

    const linkedProject: LinkedProject = {
      id: project.id,
      name: project.name,
      description: project.description || '',
      detail: 'Proyecto activo',
      status: 'active',
      progress,
      totalMilestones,
      completedMilestones: completedCount,
    };

    return { success: true, data: linkedProject };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear proyecto',
    };
  }
}
