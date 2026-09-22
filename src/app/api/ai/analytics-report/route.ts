import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // 1. Obtener el usuario autenticado de Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    const webhookUrl = process.env.N8N_ANALYTICS_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error:
            'La URL del webhook de n8n para analítica (N8N_ANALYTICS_WEBHOOK_URL) no está configurada.',
        },
        { status: 500 },
      );
    }

    const body = await request.json();

    // 2. Inyectamos el user_id en el payload que va para n8n
    const payload = {
      ...body,
      user_id: user.id,
    };

    // Enviamos el payload a n8n
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!n8nResponse.ok) {
      throw new Error(`Error en la respuesta de n8n: ${n8nResponse.statusText}`);
    }

    // Intentamos extraer el texto de la respuesta de n8n.
    // Asumimos que el nodo 'Respond to Webhook' en n8n devolverá un JSON como: { "text": "Resumen..." }
    const data = await n8nResponse.json();
    const text =
      data.text || data[0]?.text || (typeof data === 'string' ? data : JSON.stringify(data));

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error enviando datos a n8n:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al comunicarse con el webhook de n8n.' },
      { status: 500 },
    );
  }
}
