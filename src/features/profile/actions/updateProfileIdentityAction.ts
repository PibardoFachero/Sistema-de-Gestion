'use server';

import { createClient } from '@/lib/supabase/server';
import { validatePhoneNumber } from '@/features/profile/utils/phoneValidation';

export interface UpdateProfileIdentityInput {
  firstName: string;
  lastName: string;
  username: string;
  description: string;
  avatarUrl?: string;
  uploadedAvatars?: string[];
  role?: string;
  age?: string;
  workSituation?: string;
  phone?: string | null;
  telefono?: string | null;
}

export interface UpdateProfileIdentityResponse {
  success: boolean;
  error?: string;
}

export async function updateProfileIdentity(
  input: UpdateProfileIdentityInput,
): Promise<UpdateProfileIdentityResponse> {
  const normalizedFirstName = input.firstName.trim();
  const normalizedLastName = input.lastName.trim();
  const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();
  const normalizedUsername = input.username.trim().replace(/^@+/, '');
  const normalizedDescription = input.description.trim();

  if (!normalizedFirstName) {
    return { success: false, error: 'Por favor ingresa tu nombre.' };
  }

  if (normalizedFirstName.length > 50) {
    return { success: false, error: 'El nombre no puede exceder los 50 caracteres.' };
  }

  if (!normalizedLastName) {
    return { success: false, error: 'Por favor ingresa tu apellido.' };
  }

  if (normalizedLastName.length > 50) {
    return { success: false, error: 'El apellido no puede exceder los 50 caracteres.' };
  }

  if (!normalizedUsername || normalizedUsername.length < 3) {
    return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
  }

  if (normalizedUsername.length > 30) {
    return { success: false, error: 'El nombre de usuario no puede exceder los 30 caracteres.' };
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(normalizedUsername)) {
    return {
      success: false,
      error: 'El nombre de usuario solo puede contener letras, números, guiones y guiones bajos.',
    };
  }

  if (normalizedDescription.length > 1000) {
    return {
      success: false,
      error: 'La descripción del perfil debe tener como máximo 1000 caracteres.',
    };
  }

  // Validación de teléfono (opcional, debe incluir prefijo válido si se suministra)
  const rawPhone = input.phone ?? input.telefono;
  const phoneValidation = validatePhoneNumber(rawPhone);
  if (!phoneValidation.isValid) {
    return {
      success: false,
      error: phoneValidation.error || 'El número telefónico no es válido.',
    };
  }
  const formattedPhone = phoneValidation.formattedPhone;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No se encontró una sesión activa. Inicia sesión de nuevo.' };
    }

    // 1. Preparar payload para la tabla profiles (sin contexto_personal)
    const payload: Record<string, unknown> = {
      nombre_usuario: normalizedUsername,
      nombre_completo: fullName,
      descripcion: normalizedDescription || null,
      avatar_url: input.avatarUrl || null,
      telefono: formattedPhone,
      updated_at: new Date().toISOString(),
    };

    if (input.uploadedAvatars && input.uploadedAvatars.length > 0) {
      payload.avatares_subidos = input.uploadedAvatars;
    }

    if (input.role) payload.rol_condicion = input.role;
    if (input.age) payload.edad = input.age;
    if (input.workSituation) payload.situacion_laboral = input.workSituation;

    let updateResult = await supabase.from('profiles').update(payload).eq('id', user.id);

    if (updateResult.error) {
      const errorMsg = updateResult.error.message.toLowerCase();
      const cleanPayload = { ...payload };

      if (errorMsg.includes('avatares_subidos')) delete cleanPayload.avatares_subidos;
      if (errorMsg.includes('nombre_completo')) delete cleanPayload.nombre_completo;
      if (errorMsg.includes('descripcion')) delete cleanPayload.descripcion;
      if (errorMsg.includes('telefono')) delete cleanPayload.telefono;

      updateResult = await supabase.from('profiles').update(cleanPayload).eq('id', user.id);
    }

    if (updateResult.error) {
      return {
        success: false,
        error: `No fue posible actualizar tu perfil: ${updateResult.error.message}`,
      };
    }

    // 2. Sincronizar metadatos en auth.users
    try {
      const metadataUpdates: Record<string, unknown> = {
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        full_name: fullName,
        name: fullName,
        username: normalizedUsername,
        nombre_usuario: normalizedUsername,
        phone: formattedPhone,
        telefono: formattedPhone,
      };

      // CRÍTICO: Las cookies de sesión almacenan user_metadata dentro del JWT.
      // Si se guarda un data URI base64, las cookies exceden los límites HTTP
      // y Node.js lanza el error "431 Request Header Fields Too Large".
      // Por tanto, la imagen base64 se guarda EXCLUSIVAMENTE en la tabla 'profiles'.
      // En auth.users solo guardamos URLs HTTP/HTTPS o limpiamos si había base64 previo.
      if (input.avatarUrl && (input.avatarUrl.startsWith('http://') || input.avatarUrl.startsWith('https://'))) {
        metadataUpdates.avatar_url = input.avatarUrl;
      } else {
        metadataUpdates.avatar_url = null;
      }

      await supabase.auth.updateUser({
        data: metadataUpdates,
      });
    } catch {
      // Ignorar fallo de metadatos si BD ya actualizó
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Ocurrió un error inesperado al guardar tu perfil.',
    };
  }
}
