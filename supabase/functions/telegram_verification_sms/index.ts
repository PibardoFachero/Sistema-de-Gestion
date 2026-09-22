import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_TOKEN =
  Deno.env.get('TELEGRAM_TOKEN') ||
  Deno.env.get('TELEGRAM_BOT_TOKEN') ||
  '8562880898:AAEwa1ETfKPDutz8AJCRRelt_-u35gGAaA4';

const TELEGRAM_WEBHOOK_SECRET =
  Deno.env.get('TELEGRAM_WEBHOOK_SECRET') || 'My_Secret_Token_12345';

const SUPABASE_URL =
  Deno.env.get('SUPABASE_URL') || 'https://nxjqilasqjrjpvmmjxve.supabase.co';

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 1. Validar Header de Seguridad de Telegram
  const receivedSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (TELEGRAM_WEBHOOK_SECRET && receivedSecret !== TELEGRAM_WEBHOOK_SECRET) {
    console.warn('⚠️ Webhook rechazada: secret token de Telegram inválido o ausente.');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const update = await req.json();

    if (update.message?.text) {
      const fullText = update.message.text.trim();
      const chatId = update.message.chat.id;
      const rawUsername = update.message.from?.username;
      const firstName = update.message.from?.first_name || 'Estudiante';

      // Determinar identificador: @username si existe, sino chatId como string
      const identifier = rawUsername ? `@${rawUsername}` : chatId.toString();

      // Extraer comando y parámetro (ej: "/start verificacion" -> command="/start", param="verificacion")
      const parts = fullText.split(/\s+/);
      const command = parts[0]?.toLowerCase() || '';
      const param = parts[1]?.toLowerCase() || '';

      if (command === '/start' || command === '/verificar' || command === '/codigo') {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 2. Invalidar OTPs anteriores no verificados para este usuario
        await supabase
          .from('verifications')
          .update({ is_verified: true })
          .eq('telegram_chat_id', chatId)
          .eq('is_verified', false);

        // 3. Generar nuevo OTP de 6 dígitos con vencimiento a 5 minutos
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        // 4. Guardar en la base de datos
        const { error: dbError } = await supabase.from('verifications').insert([
          {
            phone_or_username: identifier,
            otp_code: otpCode,
            telegram_chat_id: chatId,
            is_verified: false,
            expires_at: expiresAt,
          },
        ]);

        if (dbError) {
          console.error('❌ Error guardando en base de datos:', dbError);
          return new Response(
            JSON.stringify({ error: 'db_error', details: dbError.message }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        // 5. Construir mensaje personalizado según el flujo
        let messageText = '';

        if (param === 'verificacion' || param === 'verify') {
          messageText =
            `🎓 <b>Aula Académica — Verificación de Cuenta</b>\n\n` +
            `¡Hola, <b>${escapeHtml(firstName)}</b>! Hemos recibido tu solicitud para verificar tu cuenta en la plataforma.\n\n` +
            `🔑 Tu código de verificación es: <code>${otpCode}</code>\n` +
            `👤 Identificador web: <code>${identifier}</code>\n\n` +
            `⏰ <i>Este código expira en 5 minutos.</i>\n\n` +
            `👉 Ingresa tu identificador y este código en la sección de <b>Perfil > Verificación con Telegram</b> para completar la vinculación.`;
        } else if (param === 'recuperacion' || param === 'recovery') {
          messageText =
            `🔐 <b>Aula Académica — Recuperación de Cuenta</b>\n\n` +
            `¡Hola, <b>${escapeHtml(firstName)}</b>! Se ha generado un código para el flujo de recuperación de tu acceso.\n\n` +
            `🔑 Tu código de seguridad es: <code>${otpCode}</code>\n` +
            `👤 Identificador web: <code>${identifier}</code>\n\n` +
            `⏰ <i>Este código expira en 5 minutos.</i>\n\n` +
            `Si no solicitaste este código, por favor ignora este mensaje.`;
        } else {
          messageText =
            `🎓 <b>Aula Académica — Asistente de Verificación</b>\n\n` +
            `¡Hola, <b>${escapeHtml(firstName)}</b>! Bienvenido al asistente oficial de autenticación de Aula Académica.\n\n` +
            `🔑 Tu código de verificación es: <code>${otpCode}</code>\n` +
            `👤 Identificador web: <code>${identifier}</code>\n\n` +
            `⏰ <i>Este código expira en 5 minutos.</i>\n\n` +
            `Ingresa estos datos en la plataforma web para validar tu cuenta o restablecer tu acceso.`;
        }

        // 6. Responder por Telegram e inspeccionar el resultado
        const telegramRes = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: messageText,
              parse_mode: 'HTML',
            }),
          },
        );

        const telegramData = await telegramRes.json();

        if (!telegramRes.ok || !telegramData.ok) {
          console.error('❌ Error desde la API de Telegram:', telegramData);
          return new Response(
            JSON.stringify({ error: 'telegram_api_error', details: telegramData }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }
      } else if (command === '/ayuda' || command === '/help') {
        const helpMessage =
          `ℹ️ <b>Ayuda — Aula Académica Bot</b>\n\n` +
          `Este bot genera códigos seguros para verificar tu cuenta o recuperarla en la plataforma Aula Académica.\n\n` +
          `📌 <b>Comandos:</b>\n` +
          `• <code>/start</code> - Genera un código OTP.\n` +
          `• <code>/verificar</code> - Solicita un nuevo código.\n` +
          `• <code>/ayuda</code> - Muestra este mensaje.`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: helpMessage,
            parse_mode: 'HTML',
          }),
        });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error en el Webhook:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
