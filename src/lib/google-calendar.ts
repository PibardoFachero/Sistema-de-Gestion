import { google } from 'googleapis';
import type { Credentials, OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  isAllDay: boolean;
  htmlLink: string | null;
  status: string | null;
}

export interface GoogleCalendarTokens extends Credentials {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string;
  token_type?: string | null;
  expiry_date?: number | null;
}

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

export const GCAL_COOKIE_NAME = 'gcal_tokens';

/**
 * Obtiene la URL de redirección configurada para OAuth2.
 */
export function getRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return `${appUrl.replace(/\/$/, '')}/api/calendar/callback`;
}

/**
 * Crea e inicializa el cliente de OAuth2 de Google.
 */
export function getGoogleOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'Faltan las variables de entorno GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET.'
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

/**
 * Genera la URL de consentimiento para que el usuario autorice el acceso a Google Calendar.
 */
export function getGoogleAuthUrl(state?: string): string {
  const oauth2Client = getGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    include_granted_scopes: true,
    state: state || undefined,
  });
}

/**
 * Intercambia el código temporal de autorización de Google por tokens de acceso y actualización.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleCalendarTokens> {
  const oauth2Client = getGoogleOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Consulta los próximos eventos del calendario principal del usuario autenticado.
 */
export async function getUpcomingCalendarEvents(
  tokens: GoogleCalendarTokens,
  options: {
    timeMin?: string;
    maxResults?: number;
  } = {}
): Promise<{ events: GoogleCalendarEvent[]; refreshedTokens?: GoogleCalendarTokens }> {
  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials(tokens);

  let refreshedTokens: GoogleCalendarTokens | undefined;

  // Escuchar si se refresca el token automáticamente para propagar la actualización
  oauth2Client.on('tokens', (newTokens) => {
    refreshedTokens = {
      ...tokens,
      ...newTokens,
    };
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const timeMin = options.timeMin || new Date().toISOString();
  const maxResults = options.maxResults ?? 50;

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const rawEvents = response.data.items || [];

  const events: GoogleCalendarEvent[] = rawEvents.map((item) => {
    const isAllDay = !item.start?.dateTime && !!item.start?.date;
    const start = item.start?.dateTime || item.start?.date || '';
    const end = item.end?.dateTime || item.end?.date || '';

    return {
      id: item.id || '',
      summary: item.summary || '(Sin título)',
      description: item.description || null,
      location: item.location || null,
      start,
      end,
      isAllDay,
      htmlLink: item.htmlLink || null,
      status: item.status || null,
    };
  });

  return { events, refreshedTokens };
}

/**
 * Cifrado AES-256-GCM para almacenamiento seguro de tokens en cookies (Zero-Trust).
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'fallback-encryption-secret-key-32b';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptTokens(tokens: GoogleCalendarTokens): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const jsonStr = JSON.stringify(tokens);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Formato: iv:authTag:encrypted (en base64url)
  const combined = `${iv.toString('hex')}:${authTag}:${encrypted}`;
  return Buffer.from(combined, 'utf8').toString('base64url');
}

export function decryptTokens(cipherText: string): GoogleCalendarTokens | null {
  try {
    const combined = Buffer.from(cipherText, 'base64url').toString('utf8');
    const [ivHex, authTagHex, encryptedHex] = combined.split(':');

    if (!ivHex || !authTagHex || !encryptedHex) return null;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as GoogleCalendarTokens;
  } catch {
    return null;
  }
}
