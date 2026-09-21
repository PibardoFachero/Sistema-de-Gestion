export type AssistantScope = 'general' | 'project' | 'topic' | 'calendar' | 'analytics';

export type AssistantMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt?: string;
};

export type AssistantContext = {
  scope: AssistantScope;
  title: string;
  description: string;
  label: string;
  suggestions?: string[];
  analyticsContext?: {
    view: AnalyticsMetricId;
    period: 'week';
  };
};

export const GENERAL_ASSISTANT_CONTEXT: AssistantContext = {
  scope: 'general',
  title: 'Asistente general',
  label: 'tu espacio de aprendizaje',
  description:
    'Un espacio para consultar, organizar ideas y recibir acompañamiento en tu recorrido de aprendizaje.',
  suggestions: [
    '¿Qué debería priorizar esta semana?',
    'Ayúdame a preparar una sesión de estudio',
    '¿Cómo puedo mantener un ritmo sostenible?',
  ],
};

export type SendAssistantMessage = (input: {
  content: string;
  context: AssistantContext;
}) => Promise<AssistantMessage>;
import type { AnalyticsMetricId } from '@/features/analytics/data/types';
