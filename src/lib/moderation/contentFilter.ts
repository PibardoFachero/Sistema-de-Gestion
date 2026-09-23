import 'server-only';
import esDict from './locales/es.json';
import enDict from './locales/en.json';
import {
  SupportedLocale,
  ModerationDictionary,
  ContentValidationResult,
} from './types';

export type { SupportedLocale, ModerationDictionary, ContentValidationResult };

/**
 * Normaliza el texto removiendo diacríticos (tildes), caracteres repetidos o símbolos leet.
 */
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/0/g, 'o')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/7/g, 't')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Diccionarios cargados por idioma para mensajes localizados.
 */
const DICTIONARIES: Record<SupportedLocale, ModerationDictionary> = {
  es: esDict as ModerationDictionary,
  en: enDict as ModerationDictionary,
};

/**
 * Prepara un Set de palabras normalizadas para búsquedas en O(1).
 */
function prepareWordSet(words: string[]): Set<string> {
  const set = new Set<string>();
  for (const word of words) {
    const norm = normalizeText(word);
    if (norm) {
      set.add(norm);
    }
  }
  return set;
}

/**
 * Prepara una lista de frases compuestas normalizadas.
 */
function preparePhrases(phrases: string[]): string[] {
  return phrases.map((phrase) => normalizeText(phrase)).filter(Boolean);
}

// 1. Unificamos los términos de todos los idiomas para proteger globalmente la plataforma
const DANGEROUS_WORDS = prepareWordSet([
  ...esDict.dangerous.words,
  ...enDict.dangerous.words,
]);

const DANGEROUS_PHRASES = preparePhrases([
  ...esDict.dangerous.phrases,
  ...enDict.dangerous.phrases,
]);

const OBSCENE_WORDS = prepareWordSet([
  ...esDict.obscene.words,
  ...enDict.obscene.words,
]);

const OBSCENE_PHRASES = preparePhrases([
  ...esDict.obscene.phrases,
  ...enDict.obscene.phrases,
]);

/**
 * Valida si un texto contiene palabras o frases peligrosas u obscenas en cualquier idioma configurado.
 * Retorna los mensajes de error en el idioma solicitado (`locale`, por defecto 'es').
 * Se ejecuta exclusivamente en el backend.
 */
export function validateContent(
  text: string,
  locale: SupportedLocale = 'es',
): ContentValidationResult {
  if (!text || text.trim() === '') {
    return { isValid: true };
  }

  const messages = DICTIONARIES[locale]?.messages || DICTIONARIES.es.messages;
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(Boolean);

  // 1. Búsqueda O(1) de palabras individuales peligrosas
  for (const word of words) {
    if (DANGEROUS_WORDS.has(word)) {
      return {
        isValid: false,
        error: messages.dangerous,
        detectedTerm: word,
        type: 'dangerous',
      };
    }
  }

  // 2. Búsqueda de frases compuestas peligrosas
  for (const phrase of DANGEROUS_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        isValid: false,
        error: messages.dangerous,
        detectedTerm: phrase,
        type: 'dangerous',
      };
    }
  }

  // 3. Búsqueda O(1) de palabras individuales obscenas o vulgares
  for (const word of words) {
    if (OBSCENE_WORDS.has(word)) {
      return {
        isValid: false,
        error: messages.obscene,
        detectedTerm: word,
        type: 'obscene',
      };
    }
  }

  // 4. Búsqueda de frases compuestas obscenas
  for (const phrase of OBSCENE_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        isValid: false,
        error: messages.obscene,
        detectedTerm: phrase,
        type: 'obscene',
      };
    }
  }

  return { isValid: true };
}

/**
 * Valida los campos de un proyecto (título y descripción/objetivo) en el backend.
 */
export function validateProjectContent(
  titulo: string,
  objetivo?: string | null,
  locale: SupportedLocale = 'es',
): ContentValidationResult {
  const titleValidation = validateContent(titulo, locale);
  if (!titleValidation.isValid) {
    return titleValidation;
  }

  if (objetivo) {
    const objectiveValidation = validateContent(objetivo, locale);
    if (!objectiveValidation.isValid) {
      return objectiveValidation;
    }
  }

  return { isValid: true };
}
