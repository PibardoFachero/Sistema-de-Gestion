'use client';

import { FormEvent, useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  Bot,
  Check,
  Lightbulb,
  MessageSquarePlus,
  Paperclip,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  GENERAL_ASSISTANT_CONTEXT,
  type AssistantContext,
  type AssistantMessage,
  type SendAssistantMessage,
} from '@/components/ia/types';
import { cn } from '@/lib/utils';

type AssistantChatProps = {
  context?: AssistantContext;
  messages?: AssistantMessage[];
  onSend?: SendAssistantMessage;
  onClearContext?: () => void;
};

export function AssistantChat({
  context = GENERAL_ASSISTANT_CONTEXT,
  messages = [],
  onSend,
  onClearContext,
}: AssistantChatProps) {
  const [conversation, setConversation] = useState(messages);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [pendingContent, setPendingContent] = useState('');
  const isConnected = Boolean(onSend);

  async function sendMessage(content: string, isRetry = false) {
    if (!onSend || !content.trim()) return;
    setStatus('loading');
    setPendingContent(content);
    if (!isRetry) {
      setConversation((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: 'user', content },
      ]);
    }
    try {
      const response = await onSend({ content, context });
      setConversation((current) => [...current, response]);
      setPendingContent('');
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || status === 'loading' || !isConnected) return;
    setDraft('');
    await sendMessage(content);
  }

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Sparkles className="size-4" />
            </span>
            Asistente IA
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{context.title}</h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">{context.description}</p>
        </div>
        <span
          className={cn(
            'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
            isConnected
              ? 'bg-status-success-bg text-status-success'
              : 'bg-status-attention-bg text-status-attention',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              isConnected ? 'bg-status-success' : 'bg-status-attention',
            )}
          />
          {isConnected ? 'Listo para conversar' : 'Conexión pendiente'}
        </span>
      </header>

      {context.scope === 'analytics' && context.analyticsContext && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] px-3 py-2 text-xs text-on-surface-variant">
          <span className="rounded-full bg-primary px-2.5 py-1 font-bold text-on-primary">
            Contexto: Analítica · {context.label}
          </span>
          <span>Se enviará solo la vista y el período, no tus títulos ni notas.</span>
          {onClearContext && (
            <button
              type="button"
              onClick={onClearContext}
              className="ml-auto rounded-lg px-2 py-1 font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Modo general
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <Card className="flex min-h-[38rem] flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-outline-variant/30 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm">
                <Bot className="size-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Komo</h2>
                <p className="text-xs text-on-surface-variant">{context.label}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setConversation([]);
                setStatus('idle');
                setPendingContent('');
              }}
              className="rounded-lg p-2 text-outline transition-colors hover:bg-surface-container hover:text-primary"
              aria-label="Nueva conversación"
              title="Nueva conversación"
            >
              <MessageSquarePlus className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto bg-surface-container-low/35 px-4 py-5 sm:px-6">
            {conversation.length === 0 && status !== 'loading' ? (
              <EmptyConversation context={context} isConnected={isConnected} />
            ) : (
              conversation.map((message) => <ChatMessage key={message.id} message={message} />)
            )}
            {status === 'loading' && <TypingIndicator />}
            {status === 'error' && (
              <div className="flex items-start gap-3 rounded-2xl border border-error/20 bg-error-container/50 p-4 text-sm">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-error" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-on-error-container">
                    No se pudo obtener una respuesta
                  </p>
                  <p className="mt-1 text-on-surface-variant">
                    Tu mensaje se conserva para que puedas intentarlo de nuevo.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 -ml-3 gap-2"
                    onClick={() => void sendMessage(pendingContent, true)}
                  >
                    <RefreshCw className="size-3.5" />
                    Reintentar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={submitMessage}
            className="border-t border-outline-variant/30 bg-surface-container-lowest p-3 sm:p-4"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-outline-variant bg-surface px-2 py-2 transition-shadow focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
              <button
                type="button"
                disabled={!isConnected}
                className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-outline transition-colors hover:bg-surface-container hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Adjuntar contenido"
              >
                <Paperclip className="size-4" />
              </button>
              <label className="sr-only" htmlFor="assistant-message">
                Escribe tu mensaje
              </label>
              <textarea
                id="assistant-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  isConnected
                    ? 'Escribe lo que necesitas...'
                    : 'El asistente se habilitará cuando esté conectado'
                }
                rows={1}
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-outline disabled:cursor-not-allowed"
                disabled={!isConnected || status === 'loading'}
              />
              <button
                type="submit"
                disabled={!draft.trim() || status === 'loading' || !isConnected}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Enviar mensaje"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
            <p className="px-2 pt-2 text-center text-[11px] text-outline">
              Komo propone; tú revisas antes de aplicar cualquier cambio.
            </p>
          </form>
        </Card>

        <aside className="space-y-4">
          {context.suggestions && context.suggestions.length > 0 && (
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Lightbulb className="size-4 text-accent-amber" />
                Consultas frecuentes
              </div>
              <div className="space-y-2">
                {context.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled={!isConnected}
                    onClick={() => setDraft(suggestion)}
                    className="w-full rounded-xl border border-outline-variant/50 bg-surface px-3 py-2.5 text-left text-xs leading-relaxed text-on-surface-variant transition-colors hover:border-primary/30 hover:bg-surface-container hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </Card>
          )}
          <Card className="bg-surface-container p-4 shadow-none">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
              <Check className="size-4" />
              Contexto controlado
            </div>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              Este chat recibirá solo la información autorizada de {context.label.toLowerCase()}{' '}
              cuando se conecte el servicio.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function EmptyConversation({
  context,
  isConnected,
}: {
  context: AssistantContext;
  isConnected: boolean;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-container text-primary">
        <Sparkles className="size-6" />
      </div>
      <h3 className="mt-4 text-lg font-bold">
        {isConnected ? 'Inicia una conversación' : 'Este espacio está preparado para Komo'}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
        {isConnected
          ? `Escribe una consulta para trabajar desde ${context.label.toLowerCase()}.`
          : `Cuando se conecte el servicio, podrás conversar desde ${context.label.toLowerCase()} sin salir de esta sección.`}
      </p>
    </div>
  );
}

function ChatMessage({ message }: { message: AssistantMessage }) {
  const isAssistant = message.role === 'assistant';
  return (
    <div className={cn('flex gap-3', !isAssistant && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg',
          isAssistant ? 'bg-primary text-on-primary' : 'bg-accent-amber/20 text-primary',
        )}
      >
        {isAssistant ? <Bot className="size-4" /> : <span className="text-xs font-bold">SO</span>}
      </div>
      <div className={cn('max-w-[85%] sm:max-w-[75%]', !isAssistant && 'text-right')}>
        <p className="mb-1 px-1 text-[11px] font-semibold text-on-surface-variant">
          {isAssistant ? 'Komo' : 'Tú'}
        </p>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isAssistant
              ? 'rounded-tl-md bg-surface-container-lowest text-on-surface shadow-sm'
              : 'rounded-tr-md bg-primary text-on-primary',
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3" role="status" aria-label="Komo está escribiendo">
      <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-on-primary">
        <Bot className="size-4" />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-surface-container-lowest px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          <span className="size-1.5 animate-bounce rounded-full bg-outline [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-outline [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-outline" />
        </div>
      </div>
    </div>
  );
}
