import { GoogleGenAI } from '@google/genai';

/**
 * Cliente singleton para la API de Google Gemini utilizando el SDK oficial @google/genai.
 * Modelo principal recomendado: gemini-3.8-flash (multimodal, visión y alta velocidad).
 */
let geminiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (geminiInstance) {
    return geminiInstance;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('La variable de entorno GEMINI_API_KEY no está configurada en .env.local');
  }

  geminiInstance = new GoogleGenAI({ apiKey });
  return geminiInstance;
}

export const GEMINI_DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
export const GEMINI_FALLBACK_MODEL = 'gemini-3.6-flash';
