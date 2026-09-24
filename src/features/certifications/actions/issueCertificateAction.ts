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
  input: IssueCertificateInput,
): Promise<IssueCertificateResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado.' };
    }

    // 1. Obtener proyecto y tareas desde 'projects'
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, titulo, completado')
      .eq('id', input.projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (projectError || !project) {
      return { success: false, error: 'Proyecto no encontrado o no tienes permisos sobre él.' };
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('tareas')
      .select('id, titulo, quiz_aprobado, duracion')
      .eq('id_proyecto', input.projectId);

    if (tasksError) {
      console.error('Error fetching tasks for certificate:', tasksError);
      return { success: false, error: 'Error al verificar las tareas del proyecto.' };
    }

    // 2. Validar que todas las tareas tengan quiz_aprobado
    const allTasks = tasks || [];
    const completedTasks = allTasks.filter((t) => t.quiz_aprobado);
    if (allTasks.length === 0 || completedTasks.length < allTasks.length) {
      return {
        success: false,
        error:
          'Debes aprobar los micro-quizzes de todas las tareas del proyecto antes de certificarte.',
      };
    }

    // 3. Calcular horas invertidas (la duración de tareas se guarda en minutos)
    const totalMinutes = completedTasks.reduce((acc, t) => acc + (Number(t.duracion) || 60), 0);
    const horasTotales = Math.max(1, Math.round(totalMinutes / 60));

    // 4. Verificar si ya existe el certificado
    const { data: existingCert } = await supabase
      .from('certificados_emitidos')
      .select('hash_sha256')
      .eq('profile_id', user.id)
      .eq('project_id', input.projectId)
      .maybeSingle();

    if (existingCert) {
      return { success: true, hash: existingCert.hash_sha256 };
    }

    // 5. Generar Hash SHA-256 (Datos del cert + Timestamp)
    const rawData = `${user.id}-${input.projectId}-${new Date().toISOString()}`;
    const hash = crypto.createHash('sha256').update(rawData).digest('hex');

    // 6. Insertar en la base de datos
    const { error: insertError } = await supabase.from('certificados_emitidos').insert({
      profile_id: user.id,
      project_id: input.projectId,
      hash_sha256: hash,
      horas_invertidas: horasTotales,
      temas_aprobados: completedTasks.length,
    });

    if (insertError) {
      console.error('Insert error in certificados_emitidos:', insertError);
      return {
        success: false,
        error:
          'No se pudo registrar el certificado en la base de datos. Asegúrate de haber ejecutado la migración de certificados en Supabase.',
      };
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
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { issued: false };

    const { data: existingCert, error } = await supabase
      .from('certificados_emitidos')
      .select('hash_sha256')
      .eq('profile_id', user.id)
      .eq('project_id', projectId)
      .maybeSingle();

    if (error || !existingCert) {
      return { issued: false };
    }

    return {
      issued: true,
      hash: existingCert.hash_sha256,
    };
  } catch {
    return { issued: false };
  }
}
