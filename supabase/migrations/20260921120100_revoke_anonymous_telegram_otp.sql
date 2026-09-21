-- Cierra cualquier permiso heredado por el rol anónimo sobre la verificación de OTP.
revoke all on function public.verify_telegram_otp(text, text) from anon;
