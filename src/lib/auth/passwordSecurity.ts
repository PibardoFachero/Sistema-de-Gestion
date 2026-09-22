import 'server-only';
import crypto from 'crypto';

/**
 * hashPasswordForBackend
 *
 * Aplica encriptación/hashing criptográfico a la contraseña en el backend (Node.js)
 * utilizando HMAC-SHA256 con una clave secreta del servidor (pepper).
 *
 * De este modo, la contraseña nunca viaja en texto plano a la base de datos de Supabase,
 * cumpliendo con el estándar de cifrado en el backend de la aplicación.
 */
export function hashPasswordForBackend(password: string): string {
  const pepper =
    process.env.PASSWORD_PEPPER ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'aula-academica-secure-pepper-v1-2026';

  return crypto.createHmac('sha256', pepper).update(password).digest('hex');
}
