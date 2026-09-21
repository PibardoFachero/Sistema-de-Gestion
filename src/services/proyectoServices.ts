import {
  createProjectAction,
  toggleTaskStatusAction,
  createTaskAction,
  deleteTaskAction,
  deleteProjectAction,
  getProjectsAction,
  getProjectDetailAction,
} from '@/features/proyectos/actions/proyectoActions';

export interface ProjectData {
  projectName: string;
  objective?: string;
  deadline?: string;
  priority: string;
  knowledge?: string;
  materials?: Record<string, unknown> | string;
  dailyMinutes: number | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow other fields from the 7 steps
}

/**
 * createProject
 * Inserta el nuevo proyecto en la tabla 'projects' de Supabase mediante createProjectAction.
 */
export const createProject = async (projectData: ProjectData) => {
  const result = await createProjectAction({
    titulo: projectData.projectName,
    objetivo: projectData.objective || '',
    fecha_limite: projectData.deadline || '',
    prioridad: projectData.priority || 'Prioritario',
    nivel_conocimiento: projectData.knowledge || '',
    material_url:
      typeof projectData.materials === 'string'
        ? projectData.materials
        : JSON.stringify(projectData.materials || {}),
    minutos_diarios: Number(projectData.dailyMinutes) || 30,
  });

  if (!result.success || !result.project) {
    throw new Error(result.error || 'Error al crear el proyecto');
  }

  return { success: true, id: result.project.id, project: result.project };
};

/**
 * toggleTaskStatus
 * Actualiza el campo 'completado' en la tabla 'tareas' y recalcula 'progreso' en 'projects'.
 */
export const toggleTaskStatus = async (
  taskId: string,
  isCompleted: boolean,
  projectId?: string,
) => {
  if (!projectId) {
    console.warn('toggleTaskStatus: projectId no proporcionado.');
  }
  return await toggleTaskStatusAction(taskId, isCompleted, projectId || '');
};

export {
  createProjectAction,
  toggleTaskStatusAction,
  createTaskAction,
  deleteTaskAction,
  deleteProjectAction,
  getProjectsAction,
  getProjectDetailAction,
};
