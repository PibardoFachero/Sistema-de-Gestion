'use server';

import { createClient } from '@/lib/supabase/server';

export interface OnboardingAnswersInput {
  rol_condicion: string;
  edad: string;
  situacion_laboral: string;
  jornada_horarios: string;
  tiempo_diario_min: string;
  metodologia: string;
  experiencia: string;
}

export interface SaveOnboardingResponse {
  success: boolean;
  error?: string;
}

export async function saveOnboardingAnswers(
  answers: OnboardingAnswersInput,
): Promise<SaveOnboardingResponse> {
  try {
    const supabase = await createClient();

    // 1. Validar sesión de usuario
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'No se encontró una sesión activa. Por favor, inicia sesión de nuevo.',
      };
    }

    // 2. Validar que las respuestas requeridas estén presentes
    if (
      !answers.rol_condicion ||
      !answers.edad ||
      !answers.situacion_laboral ||
      !answers.jornada_horarios ||
      !answers.tiempo_diario_min ||
      !answers.metodologia ||
      !answers.experiencia
    ) {
      return {
        success: false,
        error: 'Por favor responde todas las preguntas antes de finalizar.',
      };
    }

    // 3. Preparar payload para la tabla profiles
    const basePayload = {
      rol_condicion: answers.rol_condicion,
      edad: answers.edad,
      jornada_horarios: answers.jornada_horarios,
      tiempo_diario_min: answers.tiempo_diario_min,
      metodologia: answers.metodologia,
      experiencia: answers.experiencia,
    };

    // Verificar si ya existe la fila en profiles para este usuario
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existingProfile) {
      // Caso de contingencia: si la fila no fue creada por el trigger, la insertamos
      const insertPayload: Record<string, unknown> = {
        id: user.id,
        nombre_usuario:
          user.user_metadata?.username ||
          user.user_metadata?.nombre_usuario ||
          user.email?.split('@')[0] ||
          'estudiante',
        fecha_registro: new Date().toISOString(),
        racha_activa: 0,
        racha_maxima: 0,
        ...basePayload,
        situacion_laboral: answers.situacion_laboral,
      };

      let insertResult = await supabase.from('profiles').insert(insertPayload);

      // Si la BD aún tiene la columna con la errata 'sittuacion_laboral', reintentamos con ella
      if (
        insertResult.error &&
        insertResult.error.message.toLowerCase().includes('situacion_laboral')
      ) {
        delete insertPayload.situacion_laboral;
        insertPayload.sittuacion_laboral = answers.situacion_laboral;
        insertResult = await supabase.from('profiles').insert(insertPayload);
      }

      if (insertResult.error) {
        return {
          success: false,
          error: `Error al crear el perfil: ${insertResult.error.message}`,
        };
      }
    } else {
      // Caso estándar: la fila ya existe y actualizamos las respuestas
      let updateResult = await supabase
        .from('profiles')
        .update({
          ...basePayload,
          situacion_laboral: answers.situacion_laboral,
        })
        .eq('id', user.id);

      // Si la columna en Supabase aún tiene la errata 'sittuacion_laboral', fallback transparente
      if (
        updateResult.error &&
        updateResult.error.message.toLowerCase().includes('situacion_laboral')
      ) {
        updateResult = await supabase
          .from('profiles')
          .update({
            ...basePayload,
            sittuacion_laboral: answers.situacion_laboral,
          })
          .eq('id', user.id);
      }

      if (updateResult.error) {
        return {
          success: false,
          error: `Error al guardar en el perfil: ${updateResult.error.message}`,
        };
      }
    }

    // 4. Actualizar metadatos del usuario para agilizar lecturas en sesión
    try {
      await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
        },
      });
    } catch {
      // No bloqueante si la actualización de metadata falla pero la BD se guardó
    }

    return {
      success: true,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al guardar tus respuestas.',
    };
  }
}
