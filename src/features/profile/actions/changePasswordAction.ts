'use server';

import {
  changePasswordSchema,
  type ChangePasswordInput,
} from '@/features/profile/schemas/changePasswordSchema';
import { createClient } from '@/lib/supabase/server';

export interface ChangePasswordResponse {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function changePassword(
  formData: ChangePasswordInput,
): Promise<ChangePasswordResponse> {
  const validationResult = changePasswordSchema.safeParse(formData);

  if (!validationResult.success) {
    const flattenedErrors = validationResult.error.flatten().fieldErrors;
    return {
      success: false,
      error:
        flattenedErrors.currentPassword?.[0] ||
        flattenedErrors.newPassword?.[0] ||
        flattenedErrors.confirmPassword?.[0] ||
        'Por favor verifica los campos de la contraseña.',
      fieldErrors: flattenedErrors as ChangePasswordResponse['fieldErrors'],
    };
  }

  const { currentPassword, newPassword } = validationResult.data;

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return {
        success: false,
        error: 'Tu sesión no es válida o ha expirado. Inicia sesión nuevamente.',
      };
    }

    // 1. Validar la contraseña actual verificando credenciales
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      return {
        success: false,
        error: 'La contraseña actual ingresada es incorrecta.',
      };
    }

    // 2. Actualizar a la nueva contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      data: {
        has_password: true,
      },
    });

    if (updateError) {
      const lower = updateError.message.toLowerCase();
      if (lower.includes('same password') || lower.includes('different from the old')) {
        return {
          success: false,
          error: 'La nueva contraseña no puede ser igual a tu contraseña actual.',
        };
      }

      return {
        success: false,
        error: updateError.message || 'No se pudo actualizar la contraseña.',
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
          : 'Ocurrió un error inesperado al actualizar la contraseña.',
    };
  }
}
