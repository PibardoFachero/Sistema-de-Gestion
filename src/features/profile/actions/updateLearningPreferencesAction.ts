'use server';

import { createClient } from '@/lib/supabase/server';

export interface UpdateLearningPreferencesInput {
  schedule?: string;
  availability?: string;
  methodology?: string;
  experience?: string;
  objective?: string;
  pace?: string;
  difficulties?: string[];
  priorityAreas?: string[];
}

export interface UpdateLearningPreferencesResponse {
  success: boolean;
  error?: string;
}

export async function updateLearningPreferences(
  input: UpdateLearningPreferencesInput,
): Promise<UpdateLearningPreferencesResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa. Inicia sesión de nuevo.' };
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.schedule !== undefined) payload.jornada_horarios = input.schedule || null;
    if (input.availability !== undefined) payload.tiempo_diario_min = input.availability || null;
    if (input.methodology !== undefined) payload.metodologia = input.methodology || null;
    if (input.experience !== undefined) payload.experiencia = input.experience || null;

    if (input.objective !== undefined) payload.objetivo = input.objective || null;
    if (input.pace !== undefined) payload.ritmo = input.pace || null;
    if (input.difficulties !== undefined) payload.dificultades = input.difficulties;

    // Guardar áreas prioritarias (soporta columna text o text[])
    if (input.priorityAreas !== undefined) {
      payload.area_prioritaria =
        input.priorityAreas.length > 0 ? input.priorityAreas.join(', ') : null;
    }

    let updateResult = await supabase.from('profiles').update(payload).eq('id', user.id);

    // Fallback si la columna dificultades espera texto en vez de array
    if (updateResult.error && updateResult.error.message.toLowerCase().includes('dificultades')) {
      const stringifiedPayload = {
        ...payload,
        dificultades:
          input.difficulties && input.difficulties.length > 0
            ? input.difficulties.join(', ')
            : null,
      };
      updateResult = await supabase.from('profiles').update(stringifiedPayload).eq('id', user.id);
    }

    // Fallback si la columna area_prioritaria espera array en vez de texto
    if (
      updateResult.error &&
      updateResult.error.message.toLowerCase().includes('area_prioritaria')
    ) {
      const arrayPayload = {
        ...payload,
        area_prioritaria: input.priorityAreas ?? [],
      };
      updateResult = await supabase.from('profiles').update(arrayPayload).eq('id', user.id);
    }

    // Fallback defensivo si alguna columna aún no existe
    if (updateResult.error) {
      const errorMsg = updateResult.error.message.toLowerCase();
      const cleanPayload = { ...payload };

      if (errorMsg.includes('objetivo')) delete cleanPayload.objetivo;
      if (errorMsg.includes('ritmo')) delete cleanPayload.ritmo;
      if (errorMsg.includes('dificultades')) delete cleanPayload.dificultades;
      if (errorMsg.includes('area_prioritaria')) delete cleanPayload.area_prioritaria;

      updateResult = await supabase.from('profiles').update(cleanPayload).eq('id', user.id);
    }

    if (updateResult.error) {
      return {
        success: false,
        error: `Error al guardar preferencias de aprendizaje: ${updateResult.error.message}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al guardar tus preferencias.',
    };
  }
}
