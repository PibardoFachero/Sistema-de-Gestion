'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssistantChat } from '@/components/ia/AssistantChat';
import {
  GENERAL_ASSISTANT_CONTEXT,
  type AssistantMessage,
  type AssistantContext,
} from '@/components/ia/types';
import type { AnalyticsMetricId } from '@/features/analytics/data/types';

export default function IAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGeneralMode, setIsGeneralMode] = useState(false);
  const context = isGeneralMode
    ? GENERAL_ASSISTANT_CONTEXT
    : (getAnalyticsContext(searchParams) ?? GENERAL_ASSISTANT_CONTEXT);

  const handleSend = async (params: {
    content: string;
    context: AssistantContext;
  }): Promise<AssistantMessage> => {
    const response = await fetch('/api/webhooks/n8n', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje: params.content,
        tipo_evento: 'chat',
        contexto: params.context.analyticsContext
          ? { origen: 'analytics' as const, ...params.context.analyticsContext }
          : undefined,
      }),
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
      assistantResponse =
        responseData.output ||
        responseData.message ||
        responseData.response ||
        JSON.stringify(responseData);
    }

    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: assistantResponse,
    };
  };

  return (
    <AssistantChat
      context={context}
      onSend={handleSend}
      onClearContext={
        context.scope === 'analytics'
          ? () => {
              setIsGeneralMode(true);
              router.replace('/ia');
            }
          : undefined
      }
    />
  );
}

function getAnalyticsContext(params: URLSearchParams): AssistantContext | null {
  const view = params.get('view') as AnalyticsMetricId | null;
  const period = params.get('period');
  const question = params.get('question');
  const labels: Record<AnalyticsMetricId, string> = {
    workload: 'Horas planificadas',
    progress: 'Progreso de proyectos',
    priorities: 'Prioridades',
    deadlines: 'Entregas próximas',
  };

  if (params.get('source') !== 'analytics' || !view || !labels[view] || period !== 'week') {
    return null;
  }

  return {
    scope: 'analytics',
    title: 'Consulta de analítica',
    label: `${labels[view]} · Esta semana`,
    description: 'Komo responderá usando el contexto de la vista que abriste desde Analítica.',
    suggestions: question
      ? [question.slice(0, 240), 'Explícame esta vista']
      : ['Explícame esta vista'],
    analyticsContext: { view, period: 'week' },
  };
}
