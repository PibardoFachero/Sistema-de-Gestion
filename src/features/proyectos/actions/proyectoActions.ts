'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateProjectTasksFromN8n } from '@/services/automation/n8nTasksService';

export interface CreateProjectInput {
  titulo: string;
  objetivo: string;
  fecha_limite: string;
  prioridad: string;
  nivel_conocimiento: string;
  material_url?: string;
  minutos_diarios: number;
}

export interface TaskRecord {
  id: string;
  id_proyecto: string;
  titulo: string;
  duracion: number;
  completado: boolean;
  descripcion?: string | null;
  fecha_limite?: string | null;
  prioridad?: string | null;
  fecha_inicio?: string | null;
  resources?: string | null;
  url_recomendada?: string | null;
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  titulo: string;
  objetivo: string;
  fecha_limite: string;
  prioridad: string;
  nivel_conocimiento: string;
  material_url: string | null;
  minutos_diarios: number;
  progreso: number;
  completado?: boolean;
  tareas?: TaskRecord[];
}

async function userOwnsProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  projectId: string,
) {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  return !error && Boolean(data);
}

/**
 * createProjectAction
 * Registra un nuevo proyecto en la tabla 'projects' de Supabase.
 */
export async function createProjectAction(input: CreateProjectInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.' };
    }

    // Validar que la fecha límite no sea anterior a hoy
    if (input.fecha_limite) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(`${input.fecha_limite}T00:00:00`);
      if (selected < today) {
        return {
          success: false,
          error: 'La fecha límite no puede ser anterior al día de creación.',
        };
      }
    }

    const projectId = crypto.randomUUID();

    const { data: project, error: insertError } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        user_id: user.id,
        titulo: input.titulo.trim(),
        objetivo: input.objetivo.trim(),
        fecha_limite: input.fecha_limite
          ? new Date(`${input.fecha_limite}T00:00:00Z`).toISOString()
          : null,
        prioridad: input.prioridad || 'Prioritario',
        nivel_conocimiento: input.nivel_conocimiento || '',
        material_url: input.material_url || null,
        minutos_diarios: Math.round(Number(input.minutos_diarios)) || 30,
        progreso: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error insertando en projects:', insertError);
      return { success: false, error: `Error al crear proyecto: ${insertError.message}` };
    }

    // =========================================================================
    // [INTEGRACIÓN IA / N8N]:
    // Si la URL del webhook de n8n está configurada, generamos automáticamente
    // el plan de tareas inicial y lo guardamos en la tabla 'tareas' de Supabase.
    // =========================================================================
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const n8nResult = await generateProjectTasksFromN8n({
          id: project.id,
          user_id: user.id,
          titulo: project.titulo,
          objetivo: project.objetivo,
          fecha_limite: project.fecha_limite,
          prioridad: project.prioridad,
          nivel_conocimiento: project.nivel_conocimiento,
          material_url: project.material_url,
          minutos_diarios: project.minutos_diarios,
        });

        if (!n8nResult.success) {
          console.warn(
            'Advertencia: No se pudieron generar tareas con n8n al crear el proyecto:',
            n8nResult.error,
          );
        }
      } catch (n8nErr) {
        console.warn(
          'Advertencia: Excepción al generar tareas con n8n al crear el proyecto:',
          n8nErr,
        );
      }
    }

    revalidatePath('/proyectos');
    revalidatePath('/');
    return { success: true, project };
  } catch (error: unknown) {
    console.error('Error en createProjectAction:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado al crear el proyecto.';
    return { success: false, error: msg };
  }
}

/**
 * getProjectsAction
 * Carga todos los proyectos del usuario autenticado con sus tareas y progreso.
 */
export async function getProjectsAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.', projects: [] };
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select(
        'id, user_id, titulo, objetivo, fecha_limite, prioridad, nivel_conocimiento, material_url, minutos_diarios, progreso, completado',
      )
      .eq('user_id', user.id);

    if (error) {
      console.error('Error cargando projects:', error);
      return { success: false, error: error.message, projects: [] };
    }

    const projectRows = (projects ?? []) as ProjectRecord[];
    const projectIds = projectRows.map((project) => project.id);
    if (projectIds.length === 0) return { success: true, projects: [] };

    const { data: taskRows, error: tasksError } = await supabase
      .from('tareas')
      .select('id, id_proyecto, titulo, duracion, completado')
      .in('id_proyecto', projectIds);

    if (tasksError) {
      console.error('Error cargando tareas de projects:', tasksError);
      return { success: false, error: tasksError.message, projects: [] };
    }

    const tasksByProject = new Map<string, TaskRecord[]>();
    for (const task of (taskRows ?? []) as TaskRecord[]) {
      const tasks = tasksByProject.get(task.id_proyecto) ?? [];
      tasks.push(task);
      tasksByProject.set(task.id_proyecto, tasks);
    }

    return {
      success: true,
      projects: projectRows.map((project) => ({
        ...project,
        tareas: tasksByProject.get(project.id) ?? [],
      })),
    };
  } catch (error: unknown) {
    console.error('Error en getProjectsAction:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado.';
    return { success: false, error: msg, projects: [] };
  }
}

/**
 * getProjectDetailAction
 * Obtiene el detalle de un proyecto y todas sus tareas asociadas desde Supabase.
 */
export async function getProjectDetailAction(id: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.' };
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: projectError?.message || 'Proyecto no encontrado.' };
    }

    const db = supabase;

    const { data: tareas, error: tareasError } = await db
      .from('tareas')
      .select('*')
      .eq('id_proyecto', id);

    if (tareasError) {
      console.error('Error cargando tareas:', tareasError);
    }

    return {
      success: true,
      project: {
        ...project,
        tareas: tareas || [],
      },
    };
  } catch (error: unknown) {
    console.error('Error en getProjectDetailAction:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado.';
    return { success: false, error: msg };
  }
}

/**
 * toggleTaskStatusAction
 * Actualiza el campo 'completado' (boolean) de la tarea y recalcula el 'progreso' en 'projects'.
 * Además gestiona la racha: incrementa si se completa a tiempo o restablece a 0 si la tarea expiró.
 */
export async function toggleTaskStatusAction(
  taskId: string,
  isCompleted: boolean,
  projectId?: string,
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.' };
    }

    let targetProjectId = projectId;
    if (!targetProjectId) {
      const { data: tRecord } = await supabase
        .from('tareas')
        .select('id_proyecto')
        .eq('id', taskId)
        .maybeSingle();
      if (tRecord?.id_proyecto) {
        targetProjectId = tRecord.id_proyecto;
      }
    }

    if (!targetProjectId) {
      return { success: false, error: 'No se pudo identificar el proyecto de la tarea.' };
    }

    if (!(await userOwnsProject(supabase, user.id, targetProjectId))) {
      return {
        success: false,
        error: 'No tienes permiso para modificar las tareas de este proyecto.',
      };
    }

    // 1. Obtener la tarea antes de modificar para conocer su estado previo y tiempo
    const { data: existingTask } = await supabase
      .from('tareas')
      .select('id, completado, fecha_inicio, duracion')
      .eq('id', taskId)
      .eq('id_proyecto', targetProjectId)
      .maybeSingle();

    const wasCompleted = Boolean(existingTask?.completado);

    // 2. Actualizar la tarea en la tabla 'tareas'
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('tareas')
      .update({
        completado: isCompleted,
        completed_at: isCompleted ? nowIso : null,
      })
      .eq('id', taskId)
      .eq('id_proyecto', targetProjectId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Gestionar racha del usuario en la tabla 'profiles'
    let updatedRacha: number;
    let updatedRachaMaxima: number;

    const { data: profile } = await supabase
      .from('profiles')
      .select('racha_activa, racha_maxima')
      .eq('id', user.id)
      .maybeSingle();

    const currentStreak = typeof profile?.racha_activa === 'number' ? profile.racha_activa : 0;
    const currentMax = typeof profile?.racha_maxima === 'number' ? profile.racha_maxima : 0;

    if (isCompleted && !wasCompleted) {
      // Al completar una tarea: aumenta siempre el contador de racha
      updatedRacha = currentStreak + 1;
      updatedRachaMaxima = Math.max(currentMax, updatedRacha);

      await supabase
        .from('profiles')
        .update({
          racha_activa: updatedRacha,
          racha_maxima: updatedRachaMaxima,
        })
        .eq('id', user.id);
    } else if (!isCompleted && wasCompleted) {
      // Al desmarcar una tarea: decrementa la racha sin bajar de 0
      updatedRacha = Math.max(0, currentStreak - 1);
      updatedRachaMaxima = currentMax;

      await supabase
        .from('profiles')
        .update({
          racha_activa: updatedRacha,
        })
        .eq('id', user.id);
    } else {
      updatedRacha = currentStreak;
      updatedRachaMaxima = currentMax;
    }

    // 4. Obtener todas las tareas del proyecto para recalcular el porcentaje de progreso
    const { data: allTasks, error: fetchError } = await supabase
      .from('tareas')
      .select('completado')
      .eq('id_proyecto', targetProjectId);

    let newProgreso = 0;
    let isProjectCompleted = false;
    if (!fetchError && allTasks && allTasks.length > 0) {
      const completedCount = allTasks.filter((t) => t.completado).length;
      newProgreso = Math.round((completedCount / allTasks.length) * 100);
      isProjectCompleted = completedCount === allTasks.length;
    }

    // 5. Guardar el nuevo progreso y completado en la tabla 'projects'
    try {
      const { error: projError } = await supabase
        .from('projects')
        .update({ progreso: newProgreso, completado: isProjectCompleted })
        .eq('id', targetProjectId)
        .eq('user_id', user.id);

      if (projError && projError.message.includes('completado')) {
        await supabase
          .from('projects')
          .update({ progreso: newProgreso })
          .eq('id', targetProjectId)
          .eq('user_id', user.id);
      }
    } catch {
      await supabase
        .from('projects')
        .update({ progreso: newProgreso })
        .eq('id', targetProjectId)
        .eq('user_id', user.id);
    }

    revalidatePath(`/proyectos/${targetProjectId}`);
    revalidatePath('/proyectos');
    revalidatePath('/');
    revalidatePath('/perfil');
    revalidatePath('/analitica');

    return {
      success: true,
      progreso: newProgreso,
      completado: isProjectCompleted,
      racha_activa: updatedRacha,
      racha_maxima: updatedRachaMaxima,
    };
  } catch (error: unknown) {
    console.error('Error en toggleTaskStatusAction:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado.';
    return { success: false, error: msg };
  }
}

/**
 * createTaskAction
 * Inserta una nueva tarea manual en la tabla 'tareas' y actualiza el 'progreso' en 'projects'.
 */
export async function createTaskAction(data: {
  projectId: string;
  titulo: string;
  duracion: number; // en minutos
  descripcion?: string;
  prioridad?: string;
  fecha_inicio?: string | null;
  resources?: string | null;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.' };
    }

    if (!(await userOwnsProject(supabase, user.id, data.projectId))) {
      return { success: false, error: 'No tienes permiso para crear tareas en este proyecto.' };
    }

    const db = supabase;

    let parsedFechaInicio: string | null = null;
    if (data.fecha_inicio) {
      try {
        const d = new Date(data.fecha_inicio);
        parsedFechaInicio = isNaN(d.getTime()) ? data.fecha_inicio : d.toISOString();
      } catch {
        parsedFechaInicio = data.fecha_inicio;
      }
    }

    // Comprobación de conflictos de horario con tareas existentes del proyecto
    if (parsedFechaInicio) {
      const newStart = new Date(parsedFechaInicio).getTime();
      const newDurationMinutes = Math.max(1, Math.round(Number(data.duracion)) || 1);
      const newEnd = newStart + newDurationMinutes * 60 * 1000;

      const { data: existingTasks } = await db
        .from('tareas')
        .select('id, titulo, fecha_inicio, duracion')
        .eq('id_proyecto', data.projectId)
        .not('fecha_inicio', 'is', null);

      if (existingTasks && existingTasks.length > 0) {
        for (const existing of existingTasks) {
          if (!existing.fecha_inicio) continue;
          const exStart = new Date(existing.fecha_inicio).getTime();
          if (isNaN(exStart)) continue;

          const exDuration = Math.max(1, Number(existing.duracion) || 1);
          const exEnd = exStart + exDuration * 60 * 1000;

          // Caso 1: Fecha y hora exactamente igual
          if (newStart === exStart) {
            return {
              success: false,
              error: `Ya hay una tarea asignada para ese horario ("${existing.titulo}").`,
            };
          }

          // Caso 2: Conflicto de duración con horario de otra tarea
          if (newStart < exEnd && exStart < newEnd) {
            const exStartStr = new Date(existing.fecha_inicio).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            const exEndStr = new Date(exEnd).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            return {
              success: false,
              error: `El tiempo de duración entra en conflicto con la tarea "${existing.titulo}" (${exStartStr} - ${exEndStr}). No se permite solapar horarios.`,
            };
          }
        }
      }
    }

    const newTaskId = crypto.randomUUID();

    const { data: task, error: insertError } = await db
      .from('tareas')
      .insert({
        id: newTaskId,
        id_proyecto: data.projectId,
        titulo: data.titulo.trim(),
        duracion: Math.round(Number(data.duracion)) || 0,
        completado: false,
        descripcion: data.descripcion?.trim() || null,
        prioridad: data.prioridad || null,
        fecha_inicio: parsedFechaInicio,
        resources: data.resources?.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error insertando en tareas:', insertError);
      return {
        success: false,
        error: insertError.message.includes('row-level security')
          ? 'Error de permisos RLS en Supabase: ejecuta la migración SQL 20260920200000_fix_tareas_rls.sql en tu panel de Supabase o añade SUPABASE_SERVICE_ROLE_KEY a .env.local.'
          : insertError.message,
      };
    }

    // Recalcular progreso del proyecto
    const { data: allTasks } = await db
      .from('tareas')
      .select('completado')
      .eq('id_proyecto', data.projectId);

    let newProgreso = 0;
    if (allTasks && allTasks.length > 0) {
      const completedCount = allTasks.filter((t) => t.completado).length;
      newProgreso = Math.round((completedCount / allTasks.length) * 100);
    }

    try {
      const { error: projError } = await db
        .from('projects')
        .update({ progreso: newProgreso, completado: false })
        .eq('id', data.projectId)
        .eq('user_id', user.id);

      if (projError && projError.message.includes('completado')) {
        await db
          .from('projects')
          .update({ progreso: newProgreso })
          .eq('id', data.projectId)
          .eq('user_id', user.id);
      }
    } catch {
      await db
        .from('projects')
        .update({ progreso: newProgreso })
        .eq('id', data.projectId)
        .eq('user_id', user.id);
    }

    revalidatePath(`/proyectos/${data.projectId}`);
    revalidatePath('/proyectos');
    revalidatePath('/');

    return { success: true, task, progreso: newProgreso, completado: false };
  } catch (error: unknown) {
    console.error('Error en createTaskAction:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado.';
    return { success: false, error: msg };
  }
}

/**
 * deleteTaskAction
 * Elimina una tarea de la tabla 'tareas' y actualiza el progreso en 'projects'.
 */
export async function deleteTaskAction(taskId: string, projectId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.' };
    }

    if (!(await userOwnsProject(supabase, user.id, projectId))) {
      return { success: false, error: 'No tienes permiso para eliminar tareas de este proyecto.' };
    }

    const db = supabase;

    const { error: deleteError } = await db
      .from('tareas')
      .delete()
      .eq('id', taskId)
      .eq('id_proyecto', projectId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    // Recalcular progreso con las tareas restantes
    const { data: allTasks } = await db
      .from('tareas')
      .select('completado')
      .eq('id_proyecto', projectId);

    let newProgreso = 0;
    let isProjectCompleted = false;
    if (allTasks && allTasks.length > 0) {
      const completedCount = allTasks.filter((t) => t.completado).length;
      newProgreso = Math.round((completedCount / allTasks.length) * 100);
      isProjectCompleted = completedCount === allTasks.length;
    }

    try {
      const { error: projError } = await db
        .from('projects')
        .update({ progreso: newProgreso, completado: isProjectCompleted })
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (projError && projError.message.includes('completado')) {
        await db
          .from('projects')
          .update({ progreso: newProgreso })
          .eq('id', projectId)
          .eq('user_id', user.id);
      }
    } catch {
      await db
        .from('projects')
        .update({ progreso: newProgreso })
        .eq('id', projectId)
        .eq('user_id', user.id);
    }

    // Sincronizar racha de forma consistente: si el usuario ya no tiene tareas completadas, resetear racha a 0
    try {
      const { data: userProjects } = await db
        .from('projects')
        .select('id')
        .eq('user_id', user.id);

      const uProjIds = (userProjects ?? []).map((p) => p.id);
      if (uProjIds.length > 0) {
        const { data: remainingCompleted } = await db
          .from('tareas')
          .select('id')
          .in('id_proyecto', uProjIds)
          .eq('completado', true);

        const totalCompleted = remainingCompleted?.length ?? 0;
        if (totalCompleted === 0) {
          await db
            .from('profiles')
            .update({ racha_activa: 0 })
            .eq('id', user.id);
        } else {
          const { data: prof } = await db
            .from('profiles')
            .select('racha_activa')
            .eq('id', user.id)
            .maybeSingle();

          if (prof && typeof prof.racha_activa === 'number' && prof.racha_activa > totalCompleted) {
            await db
              .from('profiles')
              .update({ racha_activa: totalCompleted })
              .eq('id', user.id);
          }
        }
      } else {
        await db
          .from('profiles')
          .update({ racha_activa: 0 })
          .eq('id', user.id);
      }
    } catch (streakSyncErr) {
      console.error('Error sincronizando racha al eliminar tarea:', streakSyncErr);
    }

    revalidatePath(`/proyectos/${projectId}`);
    revalidatePath('/proyectos');
    revalidatePath('/perfil');
    revalidatePath('/');

    return { success: true, progreso: newProgreso, completado: isProjectCompleted };
  } catch (error: unknown) {
    console.error('Error en deleteTaskAction:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado.';
    return { success: false, error: msg };
  }
}

/**
 * deleteProjectAction
 * Elimina un proyecto de la tabla 'projects' y sus tareas asociadas en 'tareas'.
 */
export async function deleteProjectAction(projectId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.' };
    }

    if (!(await userOwnsProject(supabase, user.id, projectId))) {
      return { success: false, error: 'No tienes permiso para eliminar este proyecto.' };
    }

    const db = supabase;

    // Eliminar tareas asociadas primero
    await db.from('tareas').delete().eq('id_proyecto', projectId);

    // Eliminar el proyecto
    const { error: projectDeleteError } = await db
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id);

    if (projectDeleteError) {
      return { success: false, error: projectDeleteError.message };
    }

    // Sincronizar racha de forma consistente: si tras eliminar el proyecto no quedan tareas completadas, resetear racha a 0
    try {
      const { data: userProjects } = await db
        .from('projects')
        .select('id')
        .eq('user_id', user.id);

      const remainingProjIds = (userProjects ?? []).map((p) => p.id);
      if (remainingProjIds.length > 0) {
        const { data: remainingCompleted } = await db
          .from('tareas')
          .select('id')
          .in('id_proyecto', remainingProjIds)
          .eq('completado', true);

        const totalCompleted = remainingCompleted?.length ?? 0;
        if (totalCompleted === 0) {
          await db
            .from('profiles')
            .update({ racha_activa: 0 })
            .eq('id', user.id);
        } else {
          const { data: prof } = await db
            .from('profiles')
            .select('racha_activa')
            .eq('id', user.id)
            .maybeSingle();

          if (prof && typeof prof.racha_activa === 'number' && prof.racha_activa > totalCompleted) {
            await db
              .from('profiles')
              .update({ racha_activa: totalCompleted })
              .eq('id', user.id);
          }
        }
      } else {
        await db
          .from('profiles')
          .update({ racha_activa: 0 })
          .eq('id', user.id);
      }
    } catch (streakSyncErr) {
      console.error('Error sincronizando racha al eliminar proyecto:', streakSyncErr);
    }

    revalidatePath('/proyectos');
    revalidatePath('/perfil');
    revalidatePath('/');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error en deleteProjectAction:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado.';
    return { success: false, error: msg };
  }
}

/**
 * updateTaskAction
 * Actualiza los datos de una tarea existente en 'tareas' y recalcula progreso y completado en 'projects'.
 */
export async function updateTaskAction(data: {
  taskId: string;
  projectId: string;
  titulo: string;
  duracion: number; // en minutos
  descripcion?: string;
  prioridad?: string;
  fecha_inicio?: string | null;
  resources?: string | null;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.' };
    }

    if (!(await userOwnsProject(supabase, user.id, data.projectId))) {
      return {
        success: false,
        error: 'No tienes permiso para modificar las tareas de este proyecto.',
      };
    }

    const db = supabase;

    let parsedFechaInicio: string | null = null;
    if (data.fecha_inicio) {
      try {
        const d = new Date(data.fecha_inicio);
        parsedFechaInicio = isNaN(d.getTime()) ? data.fecha_inicio : d.toISOString();
      } catch {
        parsedFechaInicio = data.fecha_inicio;
      }
    }

    // Comprobación de conflictos de horario con otras tareas del proyecto (excluyendo la tarea actual)
    if (parsedFechaInicio) {
      const newStart = new Date(parsedFechaInicio).getTime();
      const newDurationMinutes = Math.max(1, Math.round(Number(data.duracion)) || 1);
      const newEnd = newStart + newDurationMinutes * 60 * 1000;

      const { data: existingTasks } = await db
        .from('tareas')
        .select('id, titulo, fecha_inicio, duracion')
        .eq('id_proyecto', data.projectId)
        .neq('id', data.taskId)
        .not('fecha_inicio', 'is', null);

      if (existingTasks && existingTasks.length > 0) {
        for (const existing of existingTasks) {
          if (!existing.fecha_inicio) continue;
          const exStart = new Date(existing.fecha_inicio).getTime();
          if (isNaN(exStart)) continue;

          const exDuration = Math.max(1, Number(existing.duracion) || 1);
          const exEnd = exStart + exDuration * 60 * 1000;

          // Caso 1: Fecha y hora exactamente igual
          if (newStart === exStart) {
            return {
              success: false,
              error: `Ya hay una tarea asignada para ese horario ("${existing.titulo}").`,
            };
          }

          // Caso 2: Conflicto de duración con horario de otra tarea
          if (newStart < exEnd && exStart < newEnd) {
            const exStartStr = new Date(existing.fecha_inicio).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            const exEndStr = new Date(exEnd).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            return {
              success: false,
              error: `El tiempo de duración entra en conflicto con la tarea "${existing.titulo}" (${exStartStr} - ${exEndStr}). No se permite solapar horarios.`,
            };
          }
        }
      }
    }

    const { data: updatedTask, error: updateError } = await db
      .from('tareas')
      .update({
        titulo: data.titulo.trim(),
        duracion: Math.round(Number(data.duracion)) || 0,
        descripcion: data.descripcion?.trim() || null,
        prioridad: data.prioridad || null,
        fecha_inicio: parsedFechaInicio,
        resources: data.resources?.trim() || null,
      })
      .eq('id', data.taskId)
      .eq('id_proyecto', data.projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando tarea:', updateError);
      return { success: false, error: updateError.message };
    }

    // Recalcular progreso y completado del proyecto
    const { data: allTasks } = await db
      .from('tareas')
      .select('completado')
      .eq('id_proyecto', data.projectId);

    let newProgreso = 0;
    let isProjectCompleted = false;
    if (allTasks && allTasks.length > 0) {
      const completedCount = allTasks.filter((t) => t.completado).length;
      newProgreso = Math.round((completedCount / allTasks.length) * 100);
      isProjectCompleted = completedCount === allTasks.length;
    }

    try {
      const { error: projError } = await db
        .from('projects')
        .update({ progreso: newProgreso, completado: isProjectCompleted })
        .eq('id', data.projectId)
        .eq('user_id', user.id);

      if (projError && projError.message.includes('completado')) {
        await db
          .from('projects')
          .update({ progreso: newProgreso })
          .eq('id', data.projectId)
          .eq('user_id', user.id);
      }
    } catch {
      await db
        .from('projects')
        .update({ progreso: newProgreso })
        .eq('id', data.projectId)
        .eq('user_id', user.id);
    }

    revalidatePath(`/proyectos/${data.projectId}`);
    revalidatePath('/proyectos');
    revalidatePath('/');

    return {
      success: true,
      task: updatedTask,
      progreso: newProgreso,
      completado: isProjectCompleted,
    };
  } catch (error: unknown) {
    console.error('Error en updateTaskAction:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado al actualizar la tarea.';
    return { success: false, error: msg };
  }
}

/**
 * generateTasksWithN8nAction
 * Server Action para invocar la IA de n8n bajo demanda para un proyecto existente.
 */
export async function generateTasksWithN8nAction(
  projectId: string,
  extraOptions?: {
    material_url?: string;
    file_content?: string;
    file_name?: string;
  },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.' };
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Proyecto no encontrado.' };
    }

    // Obtener tareas ya existentes de este proyecto para darles continuidad y no repetirlas
    const { data: existingTasks } = await supabase
      .from('tareas')
      .select('id, titulo, descripcion, completado, fecha_inicio, duracion')
      .eq('id_proyecto', projectId)
      .order('fecha_inicio', { ascending: true });

    const result = await generateProjectTasksFromN8n({
      user_id: user.id,
      id: project.id,
      titulo: project.titulo,
      objetivo: project.objetivo,
      fecha_limite: project.fecha_limite,
      prioridad: project.prioridad,
      nivel_conocimiento: project.nivel_conocimiento,
      material_url: extraOptions?.material_url?.trim() || project.material_url,
      minutos_diarios: project.minutos_diarios,
      file_content: extraOptions?.file_content,
      file_name: extraOptions?.file_name,
      existing_tasks: existingTasks || [],
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath(`/proyectos/${projectId}`);
    revalidatePath('/proyectos');
    revalidatePath('/');

    return {
      success: true,
      count: result.count,
      tasks: result.tasks,
      progreso: result.progreso,
    };
  } catch (error: unknown) {
    console.error('Error en generateTasksWithN8nAction:', error);
    const msg = error instanceof Error ? error.message : 'Error inesperado al generar tareas.';
    return { success: false, error: msg };
  }
}

/**
 * resetStreakOnOverdueAction
 * Reinicia la racha activa a 0 cuando una tarea programada expira sin completarse en el plazo establecido.
 */
export async function resetStreakOnOverdueAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa.' };
    }

    await supabase
      .from('profiles')
      .update({ racha_activa: 0 })
      .eq('id', user.id);

    revalidatePath('/perfil');
    revalidatePath('/');
    return { success: true, racha_activa: 0 };
  } catch (error: unknown) {
    console.error('Error en resetStreakOnOverdueAction:', error);
    return { success: false, error: 'Error al reiniciar racha.' };
  }
}

