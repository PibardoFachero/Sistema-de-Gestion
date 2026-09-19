'use server';

import { registerSchema } from '@/features/auth/schemas/registerSchema';
import type { RegisterActionResponse, RegisterFormData } from '@/features/auth/types/auth.types';
import { createClient } from '@/lib/supabase/server';

export async function registerUser(formData: RegisterFormData): Promise<RegisterActionResponse> {
  const validationResult = registerSchema.safeParse(formData);

  if (!validationResult.success) {
    const flattenedErrors = validationResult.error.flatten().fieldErrors;
    return {
      success: false,
      error: 'Por favor corrige los errores del formulario.',
      fieldErrors: flattenedErrors as RegisterActionResponse['fieldErrors'],
    };
  }

  const { firstName, lastName, username, email, password } = validationResult.data;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          username,
          nombre_usuario: username,
          full_name: `${firstName} ${lastName}`.trim(),
        },
      },
    });

    if (error) {
      // Manejar mensajes de error comunes de Supabase Auth
      if (error.message.toLowerCase().includes('already registered')) {
        return {
          success: false,
          error: 'Este correo electrónico ya se encuentra registrado.',
        };
      }

      return {
        success: false,
        error: error.message || 'Ocurrió un error al registrar la cuenta.',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No se pudo crear el usuario. Inténtalo de nuevo.',
      };
    }

    // Si Supabase no adjuntó sesión en signUp (p. ej. en auto-confirmación sin auto-session),
    // iniciamos sesión para garantizar que se emitan las cookies de sesión
    if (!data.session) {
      try {
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } catch {
        // Si el proyecto requiere confirmación por email, fallará y el usuario
        // será guiado a verificar su correo según la configuración de Supabase
      }
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
          : 'Error inesperado al conectar con el servidor. Inténtalo más tarde.',
    };
  }
}
