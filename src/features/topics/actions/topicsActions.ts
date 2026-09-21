'use server';

import { createClient } from '@/lib/supabase/server';
import { CreateTopicInput, Topic, TopicSource, LinkedProject, UpdateTopicInput } from '../types';
import { formatFileSize, formatRelativeDate } from '../utils/formatters';

interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getTopicsAction(): Promise<ActionResponse<Topic[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuario no autenticado' };
    }

    // 1. Obtener topics
    const { data: topicsData, error: topicsError } = await supabase
      .from('topics')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (topicsError) {
      return { success: false, error: topicsError.message };
    }

    if (!topicsData || topicsData.length === 0) {
      return { success: true, data: [] };
    }

    const topicIds = topicsData.map((t) => t.id);

    // 2. Obtener sources de los topics
    const { data: sourcesData, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .in('topic_id', topicIds)
      .order('created_at', { ascending: true });

    if (sourcesError) {
      return { success: false, error: sourcesError.message };
    }

    // 3. Obtener topic_projects vinculados
    const { data: topicProjectsData, error: tpError } = await supabase
      .from('topic_projects')
      .select('topic_id, project_id')
      .in('topic_id', topicIds);

    if (tpError) {
      return { success: false, error: tpError.message };
    }

    // 4. Obtener proyectos y sus hitos para calcular el progreso dinámico
    const projectIds = Array.from(new Set((topicProjectsData || []).map((tp) => tp.project_id)));

    const projectsMap: Record<string, { name: string; description: string; status: string; progress: number; totalMilestones: number; completedMilestones: number }> = {};

    if (projectIds.length > 0) {
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds);

      const { data: milestonesData } = await supabase
        .from('project_milestones')
        .select('*')
        .in('project_id', projectIds);

      const milestonesByProject: Record<string, { total: number; completed: number }> = {};
      (milestonesData || []).forEach((m) => {
        if (!milestonesByProject[m.project_id]) {
          milestonesByProject[m.project_id] = { total: 0, completed: 0 };
        }
        milestonesByProject[m.project_id].total += 1;
        if (m.is_completed) {
          milestonesByProject[m.project_id].completed += 1;
        }
      });

      (projectsData || []).forEach((p) => {
        const stats = milestonesByProject[p.id] || { total: 0, completed: 0 };
        const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        projectsMap[p.id] = {
          name: p.name,
          description: p.description || '',
          status: p.status || 'active',
          progress,
          totalMilestones: stats.total,
          completedMilestones: stats.completed,
        };
      });
    }

    // 5. Ensamblar modelo de datos
    const topics: Topic[] = topicsData.map((t) => {
      const topicSources: TopicSource[] = (sourcesData || [])
        .filter((s) => s.topic_id === t.id)
        .map((s) => {
          let detail = formatRelativeDate(s.updated_at || s.created_at);
          if (s.kind === 'Archivo') {
            const sizeStr = formatFileSize(Number(s.file_size || 0));
            const ext = s.file_type ? s.file_type.toUpperCase() : 'Archivo';
            detail = `${ext} · ${sizeStr}`;
          } else if (s.kind === 'Enlace') {
            detail = s.content || 'Enlace externo';
          }

          return {
            id: s.id,
            topicId: s.topic_id,
            title: s.title,
            kind: s.kind,
            content: s.content || '',
            fileUrl: s.file_url || '',
            filePath: s.file_path || '',
            fileSize: Number(s.file_size || 0),
            fileType: s.file_type || '',
            detail,
            status: s.status,
            enabledForAi: s.is_in_context,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          };
        });

      const linkedProjectIds = (topicProjectsData || [])
        .filter((tp) => tp.topic_id === t.id)
        .map((tp) => tp.project_id);

      const topicProjects: LinkedProject[] = linkedProjectIds
        .filter((pid) => !!projectsMap[pid])
        .map((pid) => {
          const p = projectsMap[pid];
          return {
            id: pid,
            name: p.name,
            description: p.description,
            detail: p.status === 'active' ? 'Proyecto activo' : 'Proyecto en planificación',
            status: p.status,
            progress: p.progress,
            totalMilestones: p.totalMilestones,
            completedMilestones: p.completedMilestones,
          };
        });

      return {
        id: t.id,
        userId: t.user_id,
        name: t.title,
        description: t.description || '',
        mainNote: t.main_note || '',
        lastEdited: formatRelativeDate(t.updated_at),
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        sources: topicSources,
        projects: topicProjects,
      };
    });

    return { success: true, data: topics };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al obtener temas',
    };
  }
}

export async function createTopicAction(input: CreateTopicInput): Promise<ActionResponse<Topic>> {
  const title = input.title.trim();
  const description = (input.description || '').trim();

  if (!title) {
    return { success: false, error: 'El título del tema es requerido.' };
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

    const { data, error } = await supabase
      .from('topics')
      .insert({
        user_id: user.id,
        title,
        description,
        main_note: '',
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const newTopic: Topic = {
      id: data.id,
      userId: data.user_id,
      name: data.title,
      description: data.description || '',
      mainNote: data.main_note || '',
      lastEdited: 'Creado ahora',
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      sources: [],
      projects: [],
    };

    return { success: true, data: newTopic };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al crear el tema',
    };
  }
}

export async function updateTopicAction(input: UpdateTopicInput): Promise<ActionResponse<Partial<Topic>>> {
  if (!input.id) {
    return { success: false, error: 'ID de tema requerido' };
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

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title !== undefined) updatePayload.title = input.title.trim();
    if (input.description !== undefined) updatePayload.description = input.description.trim();
    if (input.mainNote !== undefined) updatePayload.main_note = input.mainNote;

    const { data, error } = await supabase
      .from('topics')
      .update(updatePayload)
      .eq('id', input.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        id: data.id,
        name: data.title,
        description: data.description,
        mainNote: data.main_note,
        lastEdited: 'Editado ahora',
        updatedAt: data.updated_at,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al actualizar el tema',
    };
  }
}

export async function deleteTopicAction(topicId: string): Promise<ActionResponse<boolean>> {
  if (!topicId) {
    return { success: false, error: 'ID de tema requerido' };
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

    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al eliminar el tema',
    };
  }
}
