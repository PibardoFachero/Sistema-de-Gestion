'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
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
        await generateProjectTasksFromN8n({
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
      } catch (n8nErr) {
        console.warn('Advertencia: No se pudieron generar tareas con n8n al crear el proyecto:', n8nErr);
      }
    }

    revalidatePath('/proyectos');
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
      .select('*, tareas(id, completado, duracion, titulo)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error cargando projects:', error);
      return { success: false, error: error.message, projects: [] };
    }

    return { success: true, projects: projects || [] };
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

    const adminDb = getAdminClient();
    const db = adminDb || supabase;

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
 */
export async function toggleTaskStatusAction(
  taskId: string,
  isCompleted: boolean,
  projectId: string,
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

    const adminDb = getAdminClient();
    const db = adminDb || supabase;

    // 1. Actualizar la tarea en la tabla 'tareas'
    const { error: updateError } = await db
      .from('tareas')
      .update({ completado: isCompleted })
      .eq('id', taskId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 2. Obtener todas las tareas del proyecto para recalcular el porcentaje de progreso
    const { data: allTasks, error: fetchError } = await db
      .from('tareas')
      .select('completado')
      .eq('id_proyecto', projectId);

    let newProgreso = 0;
    let isProjectCompleted = false;
    if (!fetchError && allTasks && allTasks.length > 0) {
      const completedCount = allTasks.filter((t) => t.completado).length;
      newProgreso = Math.round((completedCount / allTasks.length) * 100);
      isProjectCompleted = completedCount === allTasks.length;
    }

    // 3. Guardar el nuevo progreso y completado en la tabla 'projects'
    try {
      const { error: projError } = await db
        .from('projects')
        .update({ progreso: newProgreso, completado: isProjectCompleted })
        .eq('id', projectId);

      if (projError && projError.message.includes('completado')) {
        await db.from('projects').update({ progreso: newProgreso }).eq('id', projectId);
      }
    } catch {
      await db.from('projects').update({ progreso: newProgreso }).eq('id', projectId);
    }

    revalidatePath(`/proyectos/${projectId}`);
    revalidatePath('/proyectos');

    return { success: true, progreso: newProgreso, completado: isProjectCompleted };
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

    const adminDb = getAdminClient();
    const db = adminDb || supabase;

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
        .eq('id', data.projectId);

      if (projError && projError.message.includes('completado')) {
        await db.from('projects').update({ progreso: newProgreso }).eq('id', data.projectId);
      }
    } catch {
      await db.from('projects').update({ progreso: newProgreso }).eq('id', data.projectId);
    }

    revalidatePath(`/proyectos/${data.projectId}`);
    revalidatePath('/proyectos');

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

    const adminDb = getAdminClient();
    const db = adminDb || supabase;

    const { error: deleteError } = await db.from('tareas').delete().eq('id', taskId);

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
        .eq('id', projectId);

      if (projError && projError.message.includes('completado')) {
        await db.from('projects').update({ progreso: newProgreso }).eq('id', projectId);
      }
    } catch {
      await db.from('projects').update({ progreso: newProgreso }).eq('id', projectId);
    }

    revalidatePath(`/proyectos/${projectId}`);
    revalidatePath('/proyectos');

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

    const adminDb = getAdminClient();
    const db = adminDb || supabase;

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

    revalidatePath('/proyectos');
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

    const adminDb = getAdminClient();
    const db = adminDb || supabase;

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
        .eq('id', data.projectId);

      if (projError && projError.message.includes('completado')) {
        await db.from('projects').update({ progreso: newProgreso }).eq('id', data.projectId);
      }
    } catch {
      await db.from('projects').update({ progreso: newProgreso }).eq('id', data.projectId);
    }

    revalidatePath(`/proyectos/${data.projectId}`);
    revalidatePath('/proyectos');

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
export async function generateTasksWithN8nAction(projectId: string) {
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

    const result = await generateProjectTasksFromN8n({
      user_id: user.id,
      id: project.id,
      titulo: project.titulo,
      objetivo: project.objetivo,
      fecha_limite: project.fecha_limite,
      prioridad: project.prioridad,
      nivel_conocimiento: project.nivel_conocimiento,
      material_url: project.material_url,
      minutos_diarios: project.minutos_diarios,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidatePath(`/proyectos/${projectId}`);
    revalidatePath('/proyectos');

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
