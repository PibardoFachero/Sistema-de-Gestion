'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BarChart3, Check, ChevronRight, Info, MessageCircle, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { formatMinutes } from '../data/calculations';
import type { AnalyticsDashboardData, AnalyticsMetricId } from '../data/types';

type Metric = {
  label: string;
  title: string;
  description: string;
  question: string;
};

const metrics: Record<AnalyticsMetricId, Metric> = {
  workload: {
    label: 'Horas planificadas',
    title: 'Tu carga planificada',
    description: 'Minutos estimados agrupados por el día de inicio de cada tarea.',
    question: '¿Cómo puedo equilibrar mi semana?',
  },
  progress: {
    label: 'Progreso',
    title: 'Avance actual por proyecto',
    description: 'Derivado de tus tareas completadas, sin usar porcentajes ilustrativos.',
    question: '¿Qué proyecto debería priorizar hoy?',
  },
  priorities: {
    label: 'Prioridades',
    title: 'Distribución de tu atención',
    description: 'Cantidad de proyectos por la prioridad que les asignaste.',
    question: '¿Mis prioridades están equilibradas?',
  },
  deadlines: {
    label: 'Entregas próximas',
    title: 'Ritmo de tus fechas límite',
    description: 'Proyectos ordenados según la cercanía de su fecha límite.',
    question: '¿Qué entrega necesita atención primero?',
  },
};

const metricIds = Object.keys(metrics) as AnalyticsMetricId[];

export function AnalyticsDashboard({ data }: { data: AnalyticsDashboardData }) {
  const [activeMetric, setActiveMetric] = useState<AnalyticsMetricId>('workload');
  const active = metrics[activeMetric];
  const availability = data.availability[activeMetric];
  const presentation = getMetricPresentation(activeMetric, data);
  const assistantHref = `/ia?source=analytics&view=${activeMetric}&period=week&question=${encodeURIComponent(active.question)}`;
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-on-primary">
              <BarChart3 className="size-4" />
            </span>
            Tu planificación
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
            Analítica
          </h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Una lectura privada de tus proyectos y tareas para ayudarte a decidir qué hacer después.
          </p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-xl border border-status-success/25 bg-status-success-bg px-3 py-2 text-xs font-semibold text-status-success">
          <Info className="size-4" />
          Datos de tu cuenta
        </span>
      </header>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-outline-variant/30 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-amber">
                {data.requestedPeriod.label}
              </p>
              <h2 className="mt-1 text-xl font-bold text-on-surface">¿Qué quieres observar?</h2>
            </div>
            <p className="text-xs leading-relaxed text-on-surface-variant sm:max-w-56 sm:text-right">
              Elige una medida por vez para no mezclar unidades ni conclusiones.
            </p>
          </div>
          <div
            className="mt-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
            role="tablist"
            aria-label="Medidas disponibles"
          >
            {metricIds.map((metricId) => {
              const isActive = metricId === activeMetric;
              return (
                <button
                  key={metricId}
                  id={`analytics-tab-${metricId}`}
                  type="button"
                  role="tab"
                  aria-controls="analytics-metric-panel"
                  aria-selected={isActive}
                  onClick={() => setActiveMetric(metricId)}
                  className={cn(
                    'flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    isActive
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-outline-variant/60 bg-surface text-on-surface-variant hover:border-primary/40 hover:bg-surface-container',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded border',
                      isActive ? 'border-on-primary/70 bg-on-primary/15' : 'border-outline-variant',
                    )}
                  >
                    {isActive && <Check className="size-3" />}
                  </span>
                  {metrics[metricId].label}
                </button>
              );
            })}
            <span className="flex min-h-11 shrink-0 items-center rounded-xl border border-dashed border-outline-variant px-3 text-sm font-medium text-outline">
              Más medidas, próximamente
            </span>
          </div>
        </div>

        <div
          id="analytics-metric-panel"
          role="tabpanel"
          aria-labelledby={`analytics-tab-${activeMetric}`}
          className="p-4 sm:p-6"
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-on-surface">{active.title}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
                {active.description}
              </p>
            </div>
            <div className="w-fit max-w-full rounded-2xl bg-surface-container px-4 py-2 text-left sm:text-right">
              <p className="text-lg font-bold text-on-surface">{presentation.value}</p>
              <p className="text-[11px] font-medium text-on-surface-variant">
                {presentation.label}
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-on-surface-variant">
            {availability.message}
          </p>
          {availability.available ? (
            <>
              <p className="sr-only">Resumen accesible: {presentation.accessibleSummary}</p>
              <div className="overflow-x-auto">
                <MetricChart metric={activeMetric} data={data} />
              </div>
            </>
          ) : (
            <EmptyMetric message={availability.message} />
          )}
          {data.messages.length > 0 && (
            <ul className="mt-5 space-y-2 text-sm leading-relaxed text-on-surface-variant">
              {data.messages.map((message) => (
                <li key={message}>• {message}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="rounded-2xl border border-primary/10 bg-primary/[0.025] p-5 sm:p-6">
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
              <Sparkles className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-primary">Qué significa esta vista</p>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
                {availability.message}
              </p>
            </div>
          </div>
        </div>
        <Link
          href={assistantHref}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-center text-sm font-bold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:w-auto"
        >
          <MessageCircle className="size-4" /> Consultar esta vista con Komo{' '}
          <ChevronRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}

function getMetricPresentation(metric: AnalyticsMetricId, data: AnalyticsDashboardData) {
  if (metric === 'workload')
    return {
      value: formatMinutes(data.summary.plannedMinutes),
      label: 'planificados esta semana',
      accessibleSummary: `${formatMinutes(data.summary.plannedMinutes)} planificados entre ${data.requestedPeriod.startsOn} y ${data.requestedPeriod.endsOn}.`,
    };
  if (metric === 'progress') {
    const value =
      data.summary.totalTasks === 0
        ? '—'
        : `${Math.round((data.summary.completedTasks / data.summary.totalTasks) * 100)}%`;
    return {
      value,
      label: `${data.summary.completedTasks} de ${data.summary.totalTasks} tareas completadas`,
      accessibleSummary: `${data.summary.completedTasks} de ${data.summary.totalTasks} tareas completadas en ${data.series.progress.length} proyectos.`,
    };
  }
  if (metric === 'priorities')
    return {
      value: String(data.summary.highPriorityProjects),
      label: 'proyectos prioritarios',
      accessibleSummary: `${data.summary.highPriorityProjects} proyectos prioritarios de ${data.summary.activeProjects} activos.`,
    };
  return {
    value: String(data.summary.upcomingDeadlines),
    label: 'entregas requieren atención',
    accessibleSummary: `${data.summary.upcomingDeadlines} fechas límite vencidas, hoy o dentro de siete días.`,
  };
}

function MetricChart({
  metric,
  data,
}: {
  metric: AnalyticsMetricId;
  data: AnalyticsDashboardData;
}) {
  if (metric === 'workload') {
    const maximum = Math.max(...data.series.workload.map((item) => item.plannedMinutes), 1);
    return (
      <div
        className="flex h-60 min-w-[34rem] items-end justify-between gap-3 border-b border-outline-variant/50 px-1 pt-6 sm:min-w-0"
        aria-label="Minutos planificados por día"
      >
        {data.series.workload.map((item) => (
          <div
            key={item.day}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <span className="text-[11px] font-semibold text-on-surface-variant">
              {item.plannedMinutes ? formatMinutes(item.plannedMinutes) : '—'}
            </span>
            <div className="flex h-40 w-full max-w-12 items-end rounded-t-xl bg-surface-container">
              <div
                className="w-full rounded-t-xl bg-accent-amber transition-all duration-500"
                style={{ height: `${(item.plannedMinutes / maximum) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-on-surface-variant">{item.label}</span>
          </div>
        ))}
      </div>
    );
  }
  if (metric === 'progress' || metric === 'priorities') {
    const rows = metric === 'progress' ? data.series.progress : data.series.priorities;
    const priorityMaximum =
      metric === 'priorities' ? Math.max(...data.series.priorities.map((row) => row.value), 1) : 1;
    return (
      <div
        className="space-y-5"
        aria-label={metric === 'progress' ? 'Progreso por proyecto' : 'Proyectos por prioridad'}
      >
        {rows.map((row) => {
          const progressRow = 'projectId' in row;
          const tone = progressRow ? 'bg-secondary' : toneClass(row.tone);
          const width = progressRow ? row.value : (row.value / priorityMaximum) * 100;
          return (
            <div key={progressRow ? row.projectId : row.name}>
              <div className="mb-2 flex items-start justify-between gap-4 text-sm">
                <span className="min-w-0 break-words font-semibold text-on-surface">
                  {row.name}
                </span>
                <span className="shrink-0 whitespace-nowrap font-bold text-on-surface">
                  {progressRow
                    ? `${row.value}% (${row.completedTasks}/${row.totalTasks})`
                    : row.value}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-outline-variant/20">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', tone)}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <ol className="min-w-0 space-y-4" aria-label="Próximas fechas límite">
      {data.series.deadlines.map((deadline, index) => (
        <li key={deadline.projectId} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-3">
          <div className="relative flex items-center justify-center" aria-hidden="true">
            {index > 0 && (
              <span className="absolute bottom-1/2 left-1/2 top-[-1rem] w-px -translate-x-1/2 bg-outline-variant/50" />
            )}
            {index < data.series.deadlines.length - 1 && (
              <span className="absolute bottom-[-1rem] left-1/2 top-1/2 w-px -translate-x-1/2 bg-outline-variant/50" />
            )}
            <span
              className={cn(
                'relative z-10 size-3 shrink-0 rounded-full border-2 border-surface-container-lowest',
                deadline.tone === 'urgent'
                  ? 'bg-status-urgent'
                  : deadline.tone === 'attention'
                    ? 'bg-status-attention'
                    : 'bg-status-success',
              )}
            />
          </div>
          <div className="min-w-0 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 px-3 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="break-words font-semibold text-on-surface">{deadline.name}</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">{deadline.relativeLabel}</p>
            </div>
            <span className="mt-2 inline-flex w-fit rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold text-on-surface-variant sm:mt-0">
              {deadline.state}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function toneClass(tone: 'priority' | 'required' | 'personal' | 'neutral') {
  if (tone === 'priority') return 'bg-secondary';
  if (tone === 'required') return 'bg-status-urgent';
  if (tone === 'personal') return 'bg-status-success';
  return 'bg-outline';
}

function EmptyMetric({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/50 px-5 py-8 text-center">
      <p className="font-semibold text-on-surface">Aún no hay datos para esta métrica</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-on-surface-variant">
        {message}
      </p>
    </div>
  );
}
