'use server';

import { createClient } from '@/lib/supabase/server';

export type VerifyTelegramOtpResponse =
  | { success: true; telegramUsername: string; verifiedAt: string }
  | { success: false; error: string };

type TelegramVerificationRow = {
  telegram_username: string;
  verified_at: string;
};

export async function verifyTelegramOtp(
  identifier: string,
  code: string,
): Promise<VerifyTelegramOtpResponse> {
  const normalizedIdentifier = identifier.trim().replace(/^@+/, '');
  const normalizedCode = code.trim();

  if (!normalizedIdentifier || normalizedIdentifier.length > 64) {
    return { success: false, error: 'Ingresa tu usuario o ID de Telegram.' };
  }

  if (!/^\d{6}$/.test(normalizedCode)) {
    return { success: false, error: 'El código de Telegram debe tener seis dígitos.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Tu sesión expiró. Inicia sesión de nuevo.' };
  }

  const { data, error } = await supabase
    .rpc('verify_telegram_otp', {
      p_identifier: normalizedIdentifier,
      p_otp: normalizedCode,
    })
    .maybeSingle();

  if (error) {
    console.error('No fue posible verificar Telegram:', error);
    return { success: false, error: 'El código no es válido, venció o ya fue utilizado.' };
  }

  const verification = data as TelegramVerificationRow | null;
  if (!verification?.telegram_username || !verification.verified_at) {
    return { success: false, error: 'El código no es válido, venció o ya fue utilizado.' };
  }

  return {
    success: true,
    telegramUsername: verification.telegram_username,
    verifiedAt: verification.verified_at,
  };
}
