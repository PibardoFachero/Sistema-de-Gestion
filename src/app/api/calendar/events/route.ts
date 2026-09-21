import { NextRequest, NextResponse } from 'next/server';
import {
  getUpcomingCalendarEvents,
  decryptTokens,
  encryptTokens,
  GCAL_COOKIE_NAME,
  type GoogleCalendarTokens,
} from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  try {
    let tokens: GoogleCalendarTokens | null = null;

    // 1. Intentar obtener el token desde el encabezado Authorization (Bearer <token>)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7).trim();
      if (bearerToken) {
        tokens = { access_token: bearerToken };
      }
    }

    // 2. Si no viene en header, obtenerlo de la cookie segura cifrada
    if (!tokens) {
      const cookie = request.cookies.get(GCAL_COOKIE_NAME);
      if (cookie?.value) {
        tokens = decryptTokens(cookie.value);
      }
    }

    // 3. Si no hay tokens válidos, retornar 401 no autorizado
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se encontró una sesión activa de Google Calendar. Inicia sesión en /api/calendar/auth.',
        },
        { status: 401 }
      );
    }

    // Parámetros de consulta opcionales
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || new Date().toISOString();
    const limitParam = searchParams.get('maxResults') || searchParams.get('limit');
    const maxResults = limitParam ? parseInt(limitParam, 10) : 50;

    // 4. Consultar eventos a Google Calendar API
    const { events, refreshedTokens } = await getUpcomingCalendarEvents(tokens, {
      timeMin,
      maxResults: isNaN(maxResults) ? 50 : maxResults,
    });

    const response = NextResponse.json({
      success: true,
      events,
      count: events.length,
    });

    // 5. Si Google emitió nuevos tokens (refresco automático), actualizar la cookie segura
    if (refreshedTokens) {
      response.cookies.set({
        name: GCAL_COOKIE_NAME,
        value: encryptTokens(refreshedTokens),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (err: unknown) {
    const errorObj = err as { code?: number | string; message?: string };
    const statusCode = typeof errorObj?.code === 'number' ? errorObj.code : 500;
    const message = errorObj?.message || 'Error al consultar los eventos de Google Calendar';

    // Si el token fue revocado o expiró de forma irrecuperable
    const isAuthRevoked =
      message.includes('invalid_grant') ||
      message.includes('Token has been expired or revoked') ||
      message.includes('invalid authentication credentials') ||
      statusCode === 401;

    const response = NextResponse.json(
      {
        success: false,
        error: isAuthRevoked
          ? 'La sesión de Google Calendar ha expirado o fue revocada. Vuelve a conectar tu cuenta.'
          : message,
      },
      { status: isAuthRevoked ? 401 : statusCode }
    );

    if (isAuthRevoked) {
      response.cookies.delete(GCAL_COOKIE_NAME);
    }

    return response;
  }
}
