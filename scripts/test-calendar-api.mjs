/**
 * Suite de Pruebas Automatizadas de QA para la API de Google Calendar
 * Ejecución: node scripts/test-calendar-api.mjs
 */

import crypto from 'crypto';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failedTests++;
  }
}

console.log('\n========================================================');
console.log('  INICIANDO SUITE DE PRUEBAS DE QA: GOOGLE CALENDAR API');
console.log(`  Target: ${BASE_URL}`);
console.log('========================================================\n');

async function testAuthEndpointJson() {
  console.log('1. Probando Endpoint de Autenticación en modo JSON (/api/calendar/auth?mode=json)...');
  try {
    const res = await fetch(`${BASE_URL}/api/calendar/auth?mode=json`, {
      headers: { Accept: 'application/json' },
    });

    assert(res.status === 200, `Código de respuesta esperado 200, recibido: ${res.status}`);

    const data = await res.json();
    assert(data.success === true, 'La respuesta contiene success: true');
    assert(typeof data.url === 'string', 'La propiedad url es una cadena válida');
    assert(
      data.url.startsWith('https://accounts.google.com/o/oauth2/v2/auth'),
      'La URL apunta al endpoint de autenticación de Google'
    );
    assert(
      data.url.includes('scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly'),
      'La URL incluye el scope https://www.googleapis.com/auth/calendar.readonly'
    );
    assert(data.url.includes('access_type=offline'), 'La URL solicita access_type=offline');
    assert(data.url.includes('prompt=consent'), 'La URL incluye prompt=consent');
    assert(
      data.url.includes('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fcalendar%2Fcallback'),
      'La URL incluye el redirect_uri configurado a http://localhost:3000/api/calendar/callback'
    );
  } catch (err) {
    assert(false, `Error en petición: ${err.message}`);
  }
}

async function testAuthEndpointRedirect() {
  console.log('\n2. Probando Endpoint de Autenticación en modo Navegador (/api/calendar/auth)...');
  try {
    const res = await fetch(`${BASE_URL}/api/calendar/auth`, {
      redirect: 'manual',
    });

    assert(res.status === 307, `Código de respuesta esperado 307 Redirect, recibido: ${res.status}`);
    const location = res.headers.get('location');
    assert(
      location && location.startsWith('https://accounts.google.com/o/oauth2/v2/auth'),
      'El encabezado Location redirige correctamente a la pantalla de consentimiento de Google'
    );
  } catch (err) {
    assert(false, `Error en petición: ${err.message}`);
  }
}

async function testCallbackMissingCode() {
  console.log('\n3. Probando Endpoint de Callback sin código (/api/calendar/callback)...');
  try {
    const res = await fetch(`${BASE_URL}/api/calendar/callback`, {
      redirect: 'manual',
    });

    assert(res.status === 307, `Código esperado 307 Redirect, recibido: ${res.status}`);
    const location = res.headers.get('location') || '';
    assert(
      location.includes('calendar_error=missing_code'),
      `Redirecciona con error missing_code (Location: ${location})`
    );
  } catch (err) {
    assert(false, `Error en petición: ${err.message}`);
  }
}

async function testCallbackDeniedAccess() {
  console.log('\n4. Probando Endpoint de Callback con error de usuario (/api/calendar/callback?error=access_denied)...');
  try {
    const res = await fetch(`${BASE_URL}/api/calendar/callback?error=access_denied`, {
      redirect: 'manual',
    });

    assert(res.status === 307, `Código esperado 307 Redirect, recibido: ${res.status}`);
    const location = res.headers.get('location') || '';
    assert(
      location.includes('calendar_error=access_denied'),
      `Redirecciona con error access_denied (Location: ${location})`
    );
  } catch (err) {
    assert(false, `Error en petición: ${err.message}`);
  }
}

async function testEventsUnauthorized() {
  console.log('\n5. Probando Endpoint de Eventos sin credenciales (/api/calendar/events)...');
  try {
    const res = await fetch(`${BASE_URL}/api/calendar/events`);

    assert(res.status === 401, `Código de respuesta esperado 401 Unauthorized, recibido: ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'La respuesta contiene success: false');
    assert(
      typeof data.error === 'string' && data.error.length > 0,
      `Contiene mensaje explicativo de error: "${data.error}"`
    );
  } catch (err) {
    assert(false, `Error en petición: ${err.message}`);
  }
}

async function testEventsInvalidBearer() {
  console.log('\n6. Probando Endpoint de Eventos con Bearer token no válido (/api/calendar/events)...');
  try {
    const res = await fetch(`${BASE_URL}/api/calendar/events`, {
      headers: {
        Authorization: 'Bearer token_invalido_de_prueba_12345',
      },
    });

    assert(res.status === 401, `Código de respuesta esperado 401 Unauthorized, recibido: ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'La respuesta contiene success: false');
    assert(
      typeof data.error === 'string',
      `Maneja rechazo de autenticación limpiamente: "${data.error}"`
    );
  } catch (err) {
    assert(false, `Error en petición: ${err.message}`);
  }
}

function testZeroTrustEncryption() {
  console.log('\n7. Probando Capa de Cifrado Zero-Trust (AES-256-GCM)...');
  try {
    const secret = 'test-secret-key-google-calendar-zero-trust';
    const key = crypto.createHash('sha256').update(secret).digest();

    const sampleTokens = {
      access_token: 'ya29.sample_mock_access_token_super_secret',
      refresh_token: '1//04_sample_refresh_token',
      expiry_date: Date.now() + 3600000,
    };

    // Cifrar
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(JSON.stringify(sampleTokens), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    const tokenCookie = Buffer.from(`${iv.toString('hex')}:${authTag}:${encrypted}`, 'utf8').toString('base64url');

    assert(!tokenCookie.includes(sampleTokens.access_token), 'El token no viaja en texto plano en la cookie');

    // Descifrar
    const decoded = Buffer.from(tokenCookie, 'base64url').toString('utf8');
    const [ivHex, authTagHex, encryptedHex] = decoded.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    const parsed = JSON.parse(decrypted);

    assert(parsed.access_token === sampleTokens.access_token, 'Integridad de access_token preservada tras descifrado');
    assert(parsed.refresh_token === sampleTokens.refresh_token, 'Integridad de refresh_token preservada tras descifrado');
    assert(parsed.expiry_date === sampleTokens.expiry_date, 'Integridad de expiry_date preservada');
  } catch (err) {
    assert(false, `Error en prueba de cifrado: ${err.message}`);
  }
}

async function runAllTests() {
  await testAuthEndpointJson();
  await testAuthEndpointRedirect();
  await testCallbackMissingCode();
  await testCallbackDeniedAccess();
  await testEventsUnauthorized();
  await testEventsInvalidBearer();
  testZeroTrustEncryption();

  console.log('\n========================================================');
  console.log(`  RESUMEN FINAL DE PRUEBAS DE QA:`);
  console.log(`  Total: ${totalTests} | Aprobadas: \x1b[32m${passedTests}\x1b[0m | Fallidas: \x1b[31m${failedTests}\x1b[0m`);
  console.log('========================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
