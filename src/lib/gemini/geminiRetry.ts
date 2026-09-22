import { GoogleGenAI } from '@google/genai';
import { getGeminiClient, GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL } from './geminiClient';

export interface GeminiRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  models?: string[];
}

/**
 * Determina si un error de Gemini es recuperable con reintento (rate limit, sobrecarga, 503, 429, etc.)
 */
export function isRetryableGeminiError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  return (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
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
 * Pausa la ejecución por un tiempo determinado en milisegundos con jitter aleatorio.
 */
export function delay(ms: number): Promise<void> {
  const jitter = Math.random() * 500;
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

/**
 * Ejecuta una llamada a Gemini con reintentos automáticos, backoff exponencial y fallback de modelo si la IA se satura.
 */
export async function callGeminiWithRetry<T>(
  operation: (ai: GoogleGenAI, model: string) => Promise<T>,
  options: GeminiRetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 2000;
  const maxDelayMs = options.maxDelayMs ?? 10000;
  const models = options.models && options.models.length > 0
    ? options.models
    : [GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL];

  let lastError: unknown = null;
  let currentDelay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const currentModel = models[Math.min(attempt, models.length - 1)];
    const ai = getGeminiClient();

    try {
      return await operation(ai, currentModel);
    } catch (err: unknown) {
      lastError = err;
      const isRetryable = isRetryableGeminiError(err);

      console.warn(
        `[Gemini Retry] Intento ${attempt + 1}/${maxRetries + 1} falló con modelo "${currentModel}". ¿Reintentable?: ${isRetryable}. Error:`,
        err instanceof Error ? err.message : err,
      );

      if (!isRetryable || attempt === maxRetries) {
        break;
      }

      console.info(
        `[Gemini Retry] Esperando ${currentDelay}ms antes del siguiente reintento...`,
      );
      await delay(currentDelay);
      currentDelay = Math.min(currentDelay * 2, maxDelayMs);
    }
  }

  throw lastError;
}
