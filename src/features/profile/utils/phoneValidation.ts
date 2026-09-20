import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, VALID_PREFIXES } from '../data/countryCodes';

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  formattedPhone: string | null;
}

export interface ParsedPhone {
  prefix: string;
  number: string;
}

/**
 * Valida un número telefónico con su prefijo.
 * Si el campo está vacío, es válido (opcional) y retorna formattedPhone = null.
 */
export function validatePhoneNumber(phoneInput?: string | null): PhoneValidationResult {
  if (!phoneInput || !phoneInput.trim()) {
    return { isValid: true, formattedPhone: null };
  }

  const trimmed = phoneInput.trim();

  // El formato debe incluir un prefijo con '+' al inicio
  if (!trimmed.startsWith('+')) {
    return {
      isValid: false,
      error: 'El número telefónico debe incluir un prefijo internacional válido que empiece con + (ej. +58).',
      formattedPhone: null,
    };
  }

  const { prefix, number } = parsePhoneNumber(trimmed);

  // Validar formato del prefijo: debe ser + seguido de 1 a 4 dígitos
  const prefixRegex = /^\+[1-9]\d{0,3}$/;
  if (!prefixRegex.test(prefix)) {
    return {
      isValid: false,
      error: `El prefijo internacional "${prefix}" no tiene un formato válido (debe ser ej. +58, +57, +1, +34).`,
      formattedPhone: null,
    };
  }

  // Verificar que el prefijo pertenezca al catálogo o formato internacional válido
  if (!VALID_PREFIXES.has(prefix) && !prefixRegex.test(prefix)) {
    return {
      isValid: false,
      error: `El prefijo telefónico "${prefix}" no es reconocido.`,
      formattedPhone: null,
    };
  }

  // Limpiar caracteres de formato (espacios, guiones, paréntesis, puntos) del número
  const digitsOnly = number.replace(/[\s\-().]/g, '');

  if (!digitsOnly) {
    // Si solo colocaron el prefijo pero no pusieron el número
    return {
      isValid: false,
      error: 'Por favor ingresa tu número telefónico o deja el campo vacío.',
      formattedPhone: null,
    };
  }

  // Verificar que el resto solo contenga dígitos numéricos
  if (!/^\d+$/.test(digitsOnly)) {
    return {
      isValid: false,
      error: 'El número telefónico solo debe contener dígitos numéricos.',
      formattedPhone: null,
    };
  }

  // Comprobar rango de longitud estándar internacional (E.164: entre 6 y 15 dígitos)
  if (digitsOnly.length < 6) {
    return {
      isValid: false,
      error: 'El número telefónico debe tener al menos 6 dígitos.',
      formattedPhone: null,
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      error: 'El número telefónico no puede exceder los 15 dígitos.',
      formattedPhone: null,
    };
  }

  // Evitar números absurdos de puros ceros (ej. 00000000)
  if (/^0+$/.test(digitsOnly)) {
    return {
      isValid: false,
      error: 'El número telefónico ingresado no es válido.',
      formattedPhone: null,
    };
  }

  // Formato estándar almacenado: "+58 412 1234567" o "+58 4121234567"
  const formattedPhone = `${prefix} ${number.trim()}`;

  return {
    isValid: true,
    formattedPhone,
  };
}

/**
 * Descompone un teléfono almacenado en la BD en su prefijo y número local
 */
export function parsePhoneNumber(storedPhone?: string | null): ParsedPhone {
  if (!storedPhone || !storedPhone.trim()) {
    return { prefix: DEFAULT_COUNTRY_CODE, number: '' };
  }

  const clean = storedPhone.trim();

  // Si no empieza con +, devolver prefijo por defecto y todo el número
  if (!clean.startsWith('+')) {
    return { prefix: DEFAULT_COUNTRY_CODE, number: clean };
  }

  // Ordenar países por longitud de prefijo descendente para priorizar prefijos largos (ej. +593 antes de +5)
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

  for (const country of sortedCodes) {
    if (clean.startsWith(country.code)) {
      const rest = clean.slice(country.code.length).trim();
      return { prefix: country.code, number: rest };
    }
  }

  // Si no está en la lista pero empieza con +, extraer con regex de prefijo
  const match = clean.match(/^(\+[1-9]\d{0,3})\s*(.*)$/);
  if (match) {
    return {
      prefix: match[1],
      number: match[2]?.trim() || '',
    };
  }

  return { prefix: DEFAULT_COUNTRY_CODE, number: clean };
}

/**
 * Construye la cadena telefónica completa a partir del prefijo y el número
 */
export function formatPhoneNumber(prefix: string, number: string): string {
  const cleanNumber = number.trim();
  if (!cleanNumber) return '';
  return `${prefix.trim()} ${cleanNumber}`;
}
