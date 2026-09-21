'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssistantChat } from '@/components/ia/AssistantChat';
import {
  GENERAL_ASSISTANT_CONTEXT,
  type AssistantMessage,
  type AssistantContext,
  type ConversationItem,
  type FileAttachment,
  type GeneratedTaskItem,
  type UserProjectItem,
} from '@/components/ia/types';
import type { AnalyticsMetricId } from '@/features/analytics/data/types';
import {
  getConversationsAction,
  getConversationMessagesAction,
  createConversationAction,
  saveMessageAction,
  updateConversationTitleAction,
  deleteConversationAction,
  createProjectFromAITasksAction,
  addTasksToExistingProjectAction,
  getUserProjectsForChatAction,
} from '@/features/ai-assistant/actions/chatActions';
import { extractAssistantResponseAndTitle } from '@/features/ai-assistant/utils/responseParser';
import { detectMessageIntent } from '@/features/ai-assistant/utils/intentDetector';

export default function IAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGeneralMode, setIsGeneralMode] = useState(false);
  const context = isGeneralMode
    ? GENERAL_ASSISTANT_CONTEXT
    : (getAnalyticsContext(searchParams) ?? GENERAL_ASSISTANT_CONTEXT);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [userProjects, setUserProjects] = useState<UserProjectItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Cargar lista de conversaciones y proyectos del usuario al montar
  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingHistory(true);
      try {
        const [convRes, projRes] = await Promise.all([
          getConversationsAction(),
          getUserProjectsForChatAction(),
        ]);

        if (convRes.success && convRes.data) {
          setConversations(convRes.data);
        }
        if (projRes.success && projRes.data) {
          setUserProjects(projRes.data);
        }
      } catch (error) {
        console.error('Error al cargar datos iniciales del asistente:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadInitialData();
  }, []);

  // Seleccionar una conversación y cargar sus mensajes
  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    try {
      const res = await getConversationMessagesAction(conversationId);
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (error) {
      console.error('Error al cargar mensajes de la conversación:', error);
    }
  };

  // Iniciar una nueva conversación en blanco
  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  // Eliminar una conversación
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversationAction(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error al eliminar conversación:', error);
    }
  };

  // Crear proyecto real en Supabase a partir de tareas sugeridas por la IA
  const handleCreateProject = async (tasks: GeneratedTaskItem[], title?: string) => {
    const res = await createProjectFromAITasksAction({
      title: title || 'Plan de estudio sugerido',
      tasks: tasks.map((t) => ({
        title: t.title || t.titulo,
        description: t.description || t.descripcion,
        duration: t.duration || t.duracion,
        resourceUrl: t.resourceUrl || t.resource_url,
      })),
    });

    if (!res.success) {
      throw new Error(res.error || 'No se pudo crear el proyecto');
    }

    // Actualizar lista de proyectos
    const projRes = await getUserProjectsForChatAction();
    if (projRes.success && projRes.data) {
      setUserProjects(projRes.data);
    }
  };

  // Agregar tareas generadas a un proyecto existente del usuario
  const handleUpdateProject = async (projectId: string, tasks: GeneratedTaskItem[]) => {
    const res = await addTasksToExistingProjectAction({
      projectId,
      tasks: tasks.map((t) => ({
        title: t.title || t.titulo,
        description: t.description || t.descripcion,
        duration: t.duration || t.duracion,
        resourceUrl: t.resourceUrl || t.resource_url,
      })),
    });

    if (!res.success) {
      throw new Error(res.error || 'No se pudo actualizar el proyecto');
    }

    // Refrescar proyectos del usuario
    const projRes = await getUserProjectsForChatAction();
    if (projRes.success && projRes.data) {
      setUserProjects(projRes.data);
    }

    return res.projectTitle || 'Proyecto';
  };

  // Enviar mensaje al asistente y guardar en Supabase
  const handleSend = async (params: {
    content: string;
    context: AssistantContext;
    fileAttachment?: FileAttachment;
    conversationId?: string | null;
  }): Promise<{
    message: AssistantMessage;
    conversationId: string;
    conversationTitle?: string;
  }> => {
    let convId = params.conversationId;

    // Detectar intención del usuario (informativa, actualización o creación)
    const intentResult = detectMessageIntent(params.content, userProjects);

    // 1. Si no hay conversación activa, crear una nueva en Supabase
    if (!convId) {
      const initialTitle = (
        params.content ||
        params.fileAttachment?.name ||
        'Nueva conversación'
      ).slice(0, 45);
      const convRes = await createConversationAction(initialTitle);
      if (!convRes.success || !convRes.data) {
        throw new Error(convRes.error || 'No se pudo iniciar la conversación');
      }
      convId = convRes.data.id;
      setActiveConversationId(convId);
      setConversations((prev) => [convRes.data!, ...prev]);
    }

    // 2. Guardar mensaje del usuario en la tabla messages
    await saveMessageAction({
      conversationId: convId,
      sender: 'user',
      content: params.content,
      contextData: params.fileAttachment ? { file: params.fileAttachment } : {},
    });

    // 3. Preparar mensaje para n8n con el texto completo del documento si fue extraído
    let mensajeToSend = params.content;
    if (params.fileAttachment?.content) {
      mensajeToSend =
        `El usuario ha adjuntado el documento "${params.fileAttachment.name}" para su análisis:\n` +
        `--- INICIO DEL DOCUMENTO ---\n${params.fileAttachment.content}\n--- FIN DEL DOCUMENTO ---\n\n` +
        `Instrucción del usuario:\n${params.content || 'Por favor analiza este documento en detalle.'}`;
    }

    // 4. Llamar al webhook de n8n
    const response = await fetch('/api/webhooks/n8n', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje: mensajeToSend,
        tipo_evento: 'chat',
        archivo: params.fileAttachment
          ? {
              nombre: params.fileAttachment.name,
              tipo: params.fileAttachment.type,
              tamano: params.fileAttachment.size,
            }
          : undefined,
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

    // 5. Parsear y limpiar respuesta
    // No anexar tareas en markdown si la consulta es de carácter informativo
    const parsed = extractAssistantResponseAndTitle(responseData, {
      includeTasksInMarkdown: intentResult.intent !== 'informational',
    });

    const cleanReply = parsed.reply;
    const aiTitle = parsed.title;

    // Solo preservar tareas si la intención no era puramente informativa
    const aiTasks =
      intentResult.intent !== 'informational'
        ? (parsed.tasks as GeneratedTaskItem[] | undefined)
        : undefined;

    // 6. Si la IA proporcionó un título para la conversación, actualizar la tabla conversations
    if (aiTitle && convId) {
      void updateConversationTitleAction(convId, aiTitle);
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, title: aiTitle } : c)));
    }

    // 7. Guardar mensaje del asistente en la tabla messages con metadatos de intención
    const assistantMsgRes = await saveMessageAction({
      conversationId: convId,
      sender: 'assistant',
      content: cleanReply,
      contextData: {
        tasks: aiTasks && aiTasks.length > 0 ? aiTasks : undefined,
        planTitle: aiTitle || undefined,
        intent: intentResult.intent,
        targetProjectId: intentResult.targetProject?.id,
        targetProjectTitle: intentResult.targetProject?.titulo,
      },
    });

    const assistantMsg: AssistantMessage = assistantMsgRes.data || {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: cleanReply,
      conversationId: convId,
      createdAt: new Date().toISOString(),
      tasks: aiTasks,
      planTitle: aiTitle,
      intent: intentResult.intent,
      targetProjectId: intentResult.targetProject?.id,
      targetProjectTitle: intentResult.targetProject?.titulo,
    };

    return {
      message: {
        ...assistantMsg,
        tasks: aiTasks,
        planTitle: aiTitle,
        intent: intentResult.intent,
        targetProjectId: intentResult.targetProject?.id,
        targetProjectTitle: intentResult.targetProject?.titulo,
      },
      conversationId: convId,
      conversationTitle: aiTitle,
    };
  };

  return (
    <AssistantChat
      context={context}
      messages={messages}
      conversations={conversations}
      userProjects={userProjects}
      activeConversationId={activeConversationId}
      isLoadingHistory={isLoadingHistory}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
      onCreateProject={handleCreateProject}
      onUpdateProject={handleUpdateProject}
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
