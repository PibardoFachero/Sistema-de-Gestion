'use server';

import { resetPasswordSchema } from '@/features/auth/schemas/resetPasswordSchema';
import type {
  ResetPasswordActionResponse,
  ResetPasswordFormData,
} from '@/features/auth/types/auth.types';
import { createClient } from '@/lib/supabase/server';
import { hashPasswordForBackend } from '@/lib/auth/passwordSecurity';

export async function updatePassword(
  formData: ResetPasswordFormData,
): Promise<ResetPasswordActionResponse> {
  const validationResult = resetPasswordSchema.safeParse(formData);

  if (!validationResult.success) {
    const flattenedErrors = validationResult.error.flatten().fieldErrors;
    return {
      success: false,
      error: 'Por favor verifica los requisitos de la contraseña.',
      fieldErrors: flattenedErrors as ResetPasswordActionResponse['fieldErrors'],
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
        error:
          'Tu sesión de recuperación no es válida o ha expirado. Por favor solicita un nuevo correo.',
      };
    }

    // [ENCRIPTACIÓN EN EL BACKEND]: Cifrar la nueva contraseña antes de persistir
    const hashedPassword = hashPasswordForBackend(password);

    const { error } = await supabase.auth.updateUser({
      password: hashedPassword,
    });

    if (error) {
      const lower = error.message.toLowerCase();
      if (lower.includes('same password') || lower.includes('different from the old')) {
        return {
          success: false,
          error: 'La nueva contraseña no puede ser igual a tu contraseña anterior.',
        };
      }

      return {
        success: false,
        error: error.message || 'No se pudo actualizar la contraseña.',
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
