'use server';

import { loginSchema } from '@/features/auth/schemas/loginSchema';
import type { LoginActionResponse, LoginFormData } from '@/features/auth/types/auth.types';
import { createClient } from '@/lib/supabase/server';

export async function loginUser(formData: LoginFormData): Promise<LoginActionResponse> {
  const validationResult = loginSchema.safeParse(formData);

  if (!validationResult.success) {
    const flattenedErrors = validationResult.error.flatten().fieldErrors;
    return {
      success: false,
      error: 'Por favor ingresa un correo y contraseña válidos.',
      fieldErrors: flattenedErrors as LoginActionResponse['fieldErrors'],
    };
  }

  const { email, password } = validationResult.data;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes('invalid login credentials') ||
        error.message.toLowerCase().includes('invalid credentials')
      ) {
        return {
          success: false,
          error: 'Credenciales incorrectas. Por favor verifica tu correo y contraseña.',
        };
      }

      if (error.message.toLowerCase().includes('email not confirmed')) {
        return {
          success: false,
          error: 'Debes confirmar tu correo electrónico antes de iniciar sesión.',
        };
      }

      return {
        success: false,
        error: error.message || 'Error al iniciar sesión.',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No se pudo iniciar sesión. Inténtalo nuevamente.',
      };
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
