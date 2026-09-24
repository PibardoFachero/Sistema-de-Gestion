'use server';

import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface IssueCertificateInput {
  projectId: string;
}

export interface IssueCertificateResponse {
  success: boolean;
  hash?: string;
  error?: string;
}

export async function issueCertificateAction(
  input: IssueCertificateInput
): Promise<IssueCertificateResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado.' };
    }

    // 1. Obtener proyecto y tareas
    const { data: project, error: projectError } = await supabase
      .from('proyectos')
      .select('titulo, completado')
      .eq('id', input.projectId)
      .single();

    if (projectError || !project) {
      return { success: false, error: 'Proyecto no encontrado.' };
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('tareas')
      .select('quiz_aprobado, horas')
      .eq('project_id', input.projectId);

    if (tasksError) {
      return { success: false, error: 'Error al verificar las tareas.' };
    }

    // 2. Validar que todas las tareas tengan quiz_aprobado
    const completedTasks = tasks.filter(t => t.quiz_aprobado);
    if (tasks.length === 0 || completedTasks.length < tasks.length) {
      return { success: false, error: 'Debes aprobar los micro-quizzes de todas las tareas del proyecto antes de certificarte.' };
    }

    // 3. Calcular horas invertidas
    const horasTotales = completedTasks.reduce((acc, t) => acc + (t.horas || 1), 0); // Asumimos 1 hora por defecto si no hay

    // 4. Verificar si ya existe el certificado
    const { data: existingCert } = await supabase
      .from('certificados_emitidos')
      .select('hash_sha256')
      .eq('profile_id', user.id)
      .eq('project_id', input.projectId)
      .single();

    if (existingCert) {
      return { success: true, hash: existingCert.hash_sha256 };
    }

    // 5. Generar Hash SHA-256 (Datos del cert + Timestamp)
    const rawData = `${user.id}-${input.projectId}-${new Date().toISOString()}`;
    const hash = crypto.createHash('sha256').update(rawData).digest('hex');

    // 6. Insertar en la base de datos
    const { error: insertError } = await supabase
      .from('certificados_emitidos')
      .insert({
        profile_id: user.id,
        project_id: input.projectId,
        hash_sha256: hash,
        horas_invertidas: horasTotales,
        temas_aprobados: completedTasks.length
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return { success: false, error: 'No se pudo emitir el certificado en la base de datos.' };
    }

    return {
      success: true,
      hash,
    };
  } catch (error) {
    console.error('Error in issueCertificateAction:', error);
    return { success: false, error: 'Ocurrió un error inesperado al emitir el certificado.' };
  }
}

export async function checkCertificateStatus(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { issued: false };

  const { data: existingCert } = await supabase
    .from('certificados_emitidos')
    .select('hash_sha256')
    .eq('profile_id', user.id)
    .eq('project_id', projectId)
    .single();

  return {
    issued: !!existingCert,
    hash: existingCert?.hash_sha256
  };
}
