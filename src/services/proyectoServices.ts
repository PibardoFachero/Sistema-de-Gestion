export interface ProjectData {
  projectName: string;
  deadline?: string;
  priority: string;
  dailyMinutes: number;
  [key: string]: any; // Allow other fields from the 7 steps
}

/**
 * createProject
 * Función que recibe el payload del cuestionario de 7 pasos.
 * Lista para hacer POST al webhook de n8n o insertar en Supabase.
 */
export const createProject = async (projectData: ProjectData) => {
  console.log('Mock: createProject called with', projectData);
  
  // TODO: Add Fetch API or Supabase client integration
  /*
  const response = await fetch('YOUR_N8N_WEBHOOK_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData),
  });
  return response.json();
  */
  
  return { success: true, id: 'proj-new' };
};

/**
 * toggleTaskStatus
 * Función asíncrona que se ejecuta al clickear el checkbox de una tarea.
 * Lista para actualizar el campo is_completed en Supabase y tocar last_active_at.
 */
export const toggleTaskStatus = async (taskId: string, isCompleted: boolean) => {
  console.log(`Mock: toggleTaskStatus called. Task ID: ${taskId} | isCompleted: ${isCompleted}`);
  
  // TODO: Add Supabase client integration
  /*
  const { data, error } = await supabase
    .from('tasks')
    .update({ is_completed: isCompleted })
    .eq('id', taskId);

  // Update user last_active_at for streaks
  await supabase
    .from('users')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', currentUser.id);
  */
  
  return { success: true };
};
