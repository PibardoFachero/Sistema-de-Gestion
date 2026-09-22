import { createClient } from '@/lib/supabase/server';

interface LogAiParams {
  usuarioId?: string | null;
  proyectoId?: string | null;
  tipoOperacion: 'generacion_cronograma' | 'regeneracion_cronograma' | 'extraccion_horario';
  modelo: string;
  promptEnviado: string;
  respuestaCruda: string;
  duracionMs?: number;
  tokensPrompt?: number;
  tokensRespuesta?: number;
  error?: string | null;
}

/**
 * Guarda en Supabase (tabla logs_ia) el registro de llamadas a Gemini para auditoría y monitoreo.
 */
export async function logAiInteraction(params: LogAiParams): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('logs_ia').insert({
      usuario_id: params.usuarioId || null,
      proyecto_id: params.proyectoId || null,
      tipo_operacion: params.tipoOperacion,
      modelo: params.modelo,
      prompt_enviado: params.promptEnviado,
      respuesta_cruda: params.respuestaCruda,
      duracion_ms: params.duracionMs || null,
      tokens_prompt: params.tokensPrompt || null,
      tokens_respuesta: params.tokensRespuesta || null,
      error: params.error || null,
    });
  } catch (err) {
    console.warn('Advertencia: no se pudo guardar registro en logs_ia:', err);
  }
}
