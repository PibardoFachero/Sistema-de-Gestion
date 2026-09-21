import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const returnTo = searchParams.get('returnTo') || '/calendario';

    // Generar la URL de consentimiento OAuth2 de Google con scope de calendario
    const authUrl = getGoogleAuthUrl(returnTo);

    // Si el cliente pide JSON explícitamente, devolvemos la URL
    if (mode === 'json' || request.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json({
        success: true,
        url: authUrl,
      });
    }

    // Por defecto, redirigir directamente al flujo de consentimiento de Google
    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al iniciar autenticación con Google';
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
