'use server';

import { resetPasswordSchema } from '@/features/auth/schemas/resetPasswordSchema';
import type { ResetPasswordFormData } from '@/features/auth/types/auth.types';
import { createClient } from '@/lib/supabase/server';

export interface AddPasswordResponse {
  success: boolean;
  error?: string;
}

export async function addPassword(formData: ResetPasswordFormData): Promise<AddPasswordResponse> {
  const validationResult = resetPasswordSchema.safeParse(formData);

  if (!validationResult.success) {
    const flattenedErrors = validationResult.error.flatten().fieldErrors;
    return {
      success: false,
      error:
        flattenedErrors.confirmPassword?.[0] ||
        flattenedErrors.password?.[0] ||
        'Por favor verifica los requisitos de la contraseña.',
    };
  }

  const { password } = validationResult.data;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'Tu sesión no es válida o ha expirado. Por favor inicia sesión nuevamente.',
      };
    }

    // Actualizar contraseña del usuario y registrar has_password en user_metadata
    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        has_password: true,
      },
    });

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes('same password') || lower.includes('different from the old')) {
        return {
          success: false,
          error: 'La nueva contraseña no puede ser igual a tu contraseña previa.',
        };
      }

      return {
        success: false,
        error: error.message || 'No se pudo agregar la contraseña.',
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
          : 'Ocurrió un error inesperado al establecer la contraseña.',
    };
  }
}
