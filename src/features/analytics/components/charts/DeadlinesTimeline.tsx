'use client';

import { cn } from '@/lib/utils';

interface DeadlinesTimelineProps {
  data: Array<{
    projectId: string;
    name: string;
    dueDate: string;
    relativeLabel: string;
    state: string;
    tone: 'urgent' | 'attention' | 'onTime';
  }>;
}

export function DeadlinesTimeline({ data }: DeadlinesTimelineProps) {
  return (
    <ol className="min-w-0 space-y-4 pt-2" aria-label="Próximas fechas límite">
      {data.map((deadline, index) => (
        <li key={deadline.projectId} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-4 group">
          <div className="relative flex items-center justify-center" aria-hidden="true">
            {index > 0 && (
              <span className="absolute bottom-1/2 left-1/2 top-[-1rem] w-px -translate-x-1/2 bg-outline-variant/50 transition-colors group-hover:bg-outline-variant" />
            )}
            {index < data.length - 1 && (
              <span className="absolute bottom-[-1rem] left-1/2 top-1/2 w-px -translate-x-1/2 bg-outline-variant/50 transition-colors group-hover:bg-outline-variant" />
            )}
            <span
              className={cn(
                'relative z-10 size-3.5 shrink-0 rounded-full border-2 border-surface-container-lowest transition-transform duration-300 group-hover:scale-125',
                deadline.tone === 'urgent'
                  ? 'bg-status-urgent shadow-[0_0_8px_rgba(184,74,57,0.5)]'
                  : deadline.tone === 'attention'
                    ? 'bg-status-attention shadow-[0_0_8px_rgba(192,125,43,0.5)]'
                    : 'bg-status-success shadow-[0_0_8px_rgba(61,122,90,0.5)]',
              )}
            />
          </div>
          <div className="min-w-0 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4 transition-all duration-300 hover:bg-surface-container hover:shadow-sm hover:-translate-y-0.5">
            <div className="min-w-0">
              <p className="break-words font-semibold text-on-surface">{deadline.name}</p>
              <p className="mt-0.5 text-sm font-medium text-on-surface-variant flex items-center gap-1">
                {deadline.relativeLabel}
                <span className="text-xs opacity-60 font-normal">({deadline.dueDate})</span>
              </p>
            </div>
            <span
              className={cn(
                'mt-2 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold sm:mt-0 transition-colors',
                deadline.tone === 'urgent'
                  ? 'bg-status-urgent-bg text-status-urgent'
                  : deadline.tone === 'attention'
                    ? 'bg-status-attention-bg text-status-attention'
                    : 'bg-status-success-bg text-status-success',
              )}
            >
              {deadline.state}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
