import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Enviamos la petición desde el servidor de Next.js hacia n8n para evitar CORS en el navegador
    const response = await fetch('https://josueromero22.app.n8n.cloud/webhook/chatbot-web', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Fallo en el servidor de n8n:', response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: `n8n respondió con error ${response.status}` },
        { status: response.status }
      );
    }

    // A veces n8n responde JSON, a veces texto plano
    const data = await response.text();
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error interno en la ruta API del webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor (Next.js)' },
      { status: 500 }
    );
  }
}
