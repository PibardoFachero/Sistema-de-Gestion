import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const requestSchema = z.object({
  mensaje: z.string().trim().min(1).max(4000),
  tipo_evento: z.literal('chat'),
  contexto: z
    .object({
      origen: z.literal('analytics'),
      view: z.enum(['workload', 'progress', 'priorities', 'deadlines']),
      period: z.literal('week'),
    })
    .optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Solicitud de chat inválida.' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json(
      { success: false, error: 'Debes iniciar sesión para usar Komo.' },
      { status: 401 },
    );
  }

  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { success: false, error: 'Komo no está configurado todavía. Inténtalo más tarde.' },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: auth.user.id,
        mensaje: parsed.data.mensaje,
        tipo_evento: 'chat',
        contexto: parsed.data.contexto,
      }),
    });

    if (!response.ok) {
      console.error('Fallo en el servidor de n8n:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: 'Komo no pudo responder en este momento. Puedes reintentar.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: await response.text() });
  } catch (error) {
    console.error('Error al conectar el webhook de n8n:', error);
    return NextResponse.json(
      { success: false, error: 'No fue posible conectar con Komo. Puedes reintentar.' },
      { status: 502 },
    );
  }
}
