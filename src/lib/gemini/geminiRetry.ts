import { GoogleGenAI } from '@google/genai';
import { getGeminiClient, GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL } from './geminiClient';

export interface GeminiRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  models?: string[];
}

/**
 * Determina si un error de Gemini es recuperable con reintento (rate limit temporal, sobrecarga, 503, 500, etc.)
 */
export function isRetryableGeminiError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  // Si la cuota diaria gratuita o por proyecto está agotada, no reintentar para evitar esperas inútiles
  if (
    lower.includes('quota exceeded') ||
    lower.includes('generaterequestsperday') ||
    (lower.includes('resource_exhausted') && lower.includes('quota'))
  ) {
    return false;
  }

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
 * Pausa la ejecución por un tiempo determinado en milisegundos con jitter aleatorio.
 */
export function delay(ms: number): Promise<void> {
  const jitter = Math.random() * 300;
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

/**
 * Ejecuta una llamada a Gemini con timeout por intento, reintentos automáticos acotados y fallback de modelo.
 */
export async function callGeminiWithRetry<T>(
  operation: (ai: GoogleGenAI, model: string) => Promise<T>,
  options: GeminiRetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 1;
  const initialDelayMs = options.initialDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 4000;
  const timeoutMs = options.timeoutMs ?? 15000;
  const models =
    options.models && options.models.length > 0
      ? options.models
      : [GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL];

  let lastError: unknown = null;
  let currentDelay = initialDelayMs;

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
