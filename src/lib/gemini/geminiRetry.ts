import { GoogleGenAI } from '@google/genai';
import {
  getGeminiClient,
  markActiveKeyExhaustedAndRotate,
  getGeminiKeyCount,
  GEMINI_DEFAULT_MODEL,
  GEMINI_FALLBACK_MODEL,
  GEMINI_LITE_MODEL,
} from './geminiClient';

export interface GeminiRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  models?: string[];
}

/**
<<<<<<< HEAD
<<<<<<< HEAD
 * Determina si un error de Gemini es recuperable con reintento (rate limit, sobrecarga, 503, 429, etc.)
=======
 * Detecta si el error corresponde a agotamiento de cuota diaria o límite duro (429 RESOURCE_EXHAUSTED).
 */
export function isQuotaExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes('quota exceeded') ||
    lower.includes('generaterequestsperday') ||
    (lower.includes('resource_exhausted') && lower.includes('quota')) ||
    (lower.includes('429') && lower.includes('free_tier'))
  );
}

/**
 * Determina si un error de Gemini es recuperable con reintento (rate limit temporal, sobrecarga, 503, 500, etc.)
>>>>>>> 497c7ac (Cambios visuales y reagenda de tareas en calendario y optimizacion de la IA)
=======
 * Determina si un error de Gemini es recuperable con reintento (rate limit temporal, sobrecarga, 503, 500, etc.)
>>>>>>> origin/main
 */
export function isRetryableGeminiError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

<<<<<<< HEAD
<<<<<<< HEAD
=======
  // Si la cuota diaria gratuita está agotada para la clave actual, no reintentar en la misma clave
  if (isQuotaExhaustedError(error)) {
    return false;
  }

>>>>>>> 497c7ac (Cambios visuales y reagenda de tareas en calendario y optimizacion de la IA)
=======
  // Si la cuota diaria gratuita o por proyecto está agotada, no reintentar para evitar esperas inútiles
  if (
    lower.includes('quota exceeded') ||
    lower.includes('generaterequestsperday') ||
    (lower.includes('resource_exhausted') && lower.includes('quota'))
  ) {
    return false;
  }

>>>>>>> origin/main
  return (
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('503') ||
    lower.includes('service unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('500') ||
    lower.includes('internal error') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed')
  );
}

/**
 * Detecta si el error es de saturación persistente (429/503) — candidato ideal para fallback a otro proveedor.
 */
export function isSaturationError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('503') ||
    lower.includes('service unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('resource_exhausted') ||
    lower.includes('timeout')
  );
}

/**
 * Pausa la ejecución por un tiempo determinado en milisegundos con jitter aleatorio.
 */
export function delay(ms: number): Promise<void> {
  const jitter = Math.random() * 300;
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

/**
<<<<<<< HEAD
<<<<<<< HEAD
 * Ejecuta una llamada a Gemini con reintentos automáticos, backoff exponencial y fallback de modelo si la IA se satura.
=======
 * Ejecuta una llamada a Gemini con timeout por intento, reintentos automáticos acotados,
 * rotación inteligente de API Keys (ante cuota agotada) y fallback de modelo.
>>>>>>> 497c7ac (Cambios visuales y reagenda de tareas en calendario y optimizacion de la IA)
=======
 * Ejecuta una llamada a Gemini con timeout por intento, reintentos automáticos acotados y fallback de modelo.
>>>>>>> origin/main
 */
export async function callGeminiWithRetry<T>(
  operation: (ai: GoogleGenAI, model: string) => Promise<T>,
  options: GeminiRetryOptions = {},
): Promise<T> {
<<<<<<< HEAD
<<<<<<< HEAD
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 2000;
  const maxDelayMs = options.maxDelayMs ?? 10000;
  const models = options.models && options.models.length > 0
    ? options.models
    : [GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL];
=======
  const maxRetries = options.maxRetries ?? 1;
  const initialDelayMs = options.initialDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const timeoutMs = options.timeoutMs ?? 25000;
  const models =
    options.models && options.models.length > 0
      ? options.models
      : [GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_LITE_MODEL];
>>>>>>> 497c7ac (Cambios visuales y reagenda de tareas en calendario y optimizacion de la IA)
=======
  const maxRetries = options.maxRetries ?? 1;
  const initialDelayMs = options.initialDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const timeoutMs = options.timeoutMs ?? 15000;
  const models =
    options.models && options.models.length > 0
      ? options.models
      : [GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL];
>>>>>>> origin/main

  let lastError: unknown = null;
  let currentDelay = initialDelayMs;
  const totalKeys = Math.max(1, getGeminiKeyCount());
  let keyRotationsDone = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const currentModel = models[Math.min(attempt, models.length - 1)];
    const ai = getGeminiClient();

    try {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(
            new Error(`Timeout de Gemini (${timeoutMs}ms) excedido para modelo ${currentModel}`),
          );
        }, timeoutMs);
      });

      const operationPromise = operation(ai, currentModel);
      const result = await Promise.race([operationPromise, timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      return result;
    } catch (err: unknown) {
      lastError = err;

      // 1. Si el error es de cuota agotada y hay más claves en el pool, rotar inmediatamente y reintentar
      if (isQuotaExhaustedError(err) && keyRotationsDone < totalKeys - 1) {
        const rotated = markActiveKeyExhaustedAndRotate();
        if (rotated) {
          keyRotationsDone++;
          console.info(`[Gemini Retry] Clave rotada con éxito. Reintentando de inmediato con la nueva clave...`);
          // Reintentar sin gastar el contador de attempts normales
          attempt--;
          continue;
        }
      }

      const isRetryable = isRetryableGeminiError(err);

      console.warn(
        `[Gemini Retry] Intento ${attempt + 1}/${maxRetries + 1} falló con modelo "${currentModel}". ¿Reintentable?: ${isRetryable}. Error:`,
        err instanceof Error ? err.message : err,
      );

      if (!isRetryable || attempt === maxRetries) {
        break;
      }

      console.info(`[Gemini Retry] Esperando ${currentDelay}ms antes del siguiente reintento...`);
      await delay(currentDelay);
      currentDelay = Math.min(currentDelay * 2, maxDelayMs);
    }
  }

  throw lastError;
}
