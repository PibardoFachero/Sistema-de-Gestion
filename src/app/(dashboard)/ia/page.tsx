'use client';

import { AssistantChat } from '@/components/ia/AssistantChat';
import { GENERAL_ASSISTANT_CONTEXT, type AssistantMessage, type AssistantContext } from '@/components/ia/types';
import { createClient } from '@/lib/supabase/client';

export default function IAPage() {
  
  const handleSend = async (params: { content: string; context: AssistantContext }): Promise<AssistantMessage> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const response = await fetch('/api/webhooks/n8n', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user?.id || 'usuario_no_autenticado',
        mensaje: params.content,
        tipo_evento: 'chat'
      })
    });

    if (!response.ok) {
      throw new Error('Error de conexión con el asistente');
    }

    const json = await response.json();
    const responseData = json.data;

    let assistantResponse = 'Lo siento, no pude procesar tu solicitud.';
    
    // n8n a veces devuelve la respuesta directamente como string plano, o como un JSON stringificado
    if (typeof responseData === 'string') {
      try {
        const parsed = JSON.parse(responseData);
        assistantResponse = parsed.output || parsed.message || parsed.response || responseData;
      } catch {
        // No es JSON, es texto plano
        assistantResponse = responseData;
      }
    } else if (typeof responseData === 'object' && responseData !== null) {
      assistantResponse = responseData.output || responseData.message || responseData.response || JSON.stringify(responseData);
    }

    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: assistantResponse
    };
  };

  return (
    <AssistantChat context={GENERAL_ASSISTANT_CONTEXT} onSend={handleSend} />
  );
}
