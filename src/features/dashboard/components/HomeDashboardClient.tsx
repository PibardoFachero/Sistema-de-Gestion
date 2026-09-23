'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Coffee, Calendar, ShieldCheck, Flame, TrendingUp } from 'lucide-react';
import { formatMinutes } from '@/features/analytics/data/calculations';
import { HomeTaskList, HomeTaskItem } from '@/features/tasks/components/HomeTaskList';
import {
  HomeActiveProjects,
  HomeProjectItem,
} from '@/features/proyectos/components/HomeActiveProjects';
import { resetStreakOnOverdueAction } from '@/features/proyectos/actions/proyectoActions';
import { isTaskOverdue } from '@/features/gamification/services/streakService';

export interface UserData {
  displayName: string;
  saludo: string;
  displayDate: string;
}

export interface DashboardMetrics {
  rachaActiva: number;
  rachaMaxima: number;
  weeklyMinutes: number;
  weeklyTargetMinutes: number;
  weeklyProgressPercent: number;
  todayCompleted: number;
  todayTotal: number;
  globalProgress: number;
  totalTasksCount: number;
  completedTasksCount: number;
}

interface HomeDashboardClientProps {
  userData: UserData;
  initialMetrics: DashboardMetrics;
  initialTasks: HomeTaskItem[];
  initialProjects: HomeProjectItem[];
}

export function HomeDashboardClient({
  userData,
  initialMetrics,
  initialTasks,
  initialProjects,
}: HomeDashboardClientProps) {
  const router = useRouter();
  const [prevMetrics, setPrevMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  if (initialMetrics !== prevMetrics) {
    setPrevMetrics(initialMetrics);
    setMetrics(initialMetrics);
  }

  const [prevTasks, setPrevTasks] = useState<HomeTaskItem[]>(initialTasks);
  const [tasks, setTasks] = useState<HomeTaskItem[]>(initialTasks);
  if (initialTasks !== prevTasks) {
    setPrevTasks(initialTasks);
    setTasks(initialTasks);
  }

  const [prevProjects, setPrevProjects] = useState<HomeProjectItem[]>(initialProjects);
  const [projects, setProjects] = useState<HomeProjectItem[]>(initialProjects);
  if (initialProjects !== prevProjects) {
    setPrevProjects(initialProjects);
    setProjects(initialProjects);
  }

  // Escuchar eventos globales de actualización de proyectos o tareas
  useEffect(() => {
    const handleUpdated = () => {
      router.refresh();
    };

    window.addEventListener('projects_updated', handleUpdated);
    return () => {
      window.removeEventListener('projects_updated', handleUpdated);
    };
  }, [router]);

  // Comprobar periódicamente si alguna tarea no completada ha vencido su plazo para reiniciar la racha a 0
  useEffect(() => {
    const checkOverdueInterval = setInterval(async () => {
      const now = Date.now();
      const hasOverdueUncompleted = tasks.some((t) => {
        if (t.completado || !t.fecha_inicio) return false;
        return isTaskOverdue(t, now);
      });

      if (hasOverdueUncompleted && metrics.rachaActiva > 0) {
        setMetrics((prev) => ({ ...prev, rachaActiva: 0 }));
        await resetStreakOnOverdueAction();
        router.refresh();
      }
    }, 15000);

    return () => clearInterval(checkOverdueInterval);
  }, [tasks, metrics.rachaActiva, router]);

  // Manejar el cambio de estado de una tarea con reactividad instantánea
  const handleTaskToggled = (taskId: string, newCompleted: boolean, newStreak?: number) => {
    const delta = newCompleted ? 1 : -1;

    // 1. Actualizar métricas en tiempo real
    setMetrics((prev) => {
      const nextRacha =
        typeof newStreak === 'number'
          ? newStreak
          : newCompleted
            ? prev.rachaActiva + 1
            : Math.max(0, prev.rachaActiva - 1);

      const nextMax = Math.max(prev.rachaMaxima, nextRacha);
      const nextTodayCompleted = Math.max(
        0,
        Math.min(prev.todayTotal, prev.todayCompleted + delta),
      );
      const nextCompletedTasks = Math.max(0, prev.completedTasksCount + delta);
      const nextGlobalProgress =
        prev.totalTasksCount > 0
          ? Math.min(100, Math.round((nextCompletedTasks / prev.totalTasksCount) * 100))
          : 0;

      return {
        ...prev,
        rachaActiva: nextRacha,
        rachaMaxima: nextMax,
        todayCompleted: nextTodayCompleted,
        completedTasksCount: nextCompletedTasks,
        globalProgress: nextGlobalProgress,
      };
    });

    // 2. Actualizar la tarea dentro del listado
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completado: newCompleted } : t)));

    // 3. Actualizar la barra de progreso del proyecto correspondiente
    const targetTask = tasks.find((t) => t.id === taskId);
    if (targetTask) {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== targetTask.id_proyecto) return p;
          const nextCompleted = Math.max(0, Math.min(p.totalTasks, p.completedTasks + delta));
          const nextProg =
            p.totalTasks > 0 ? Math.min(100, Math.round((nextCompleted / p.totalTasks) * 100)) : 0;
          return {
            ...p,
            completedTasks: nextCompleted,
            progreso: nextProg,
          };
        }),
      );
    }

    // 4. Sincronizar caché de Next.js en segundo plano
    router.refresh();
  };

  const pendingToday = tasks.filter((t) => !t.completado).length;
  let subtitle = '';
  if (tasks.length > 0) {
    subtitle = `${userData.displayDate} · Tienes ${pendingToday} ${
      pendingToday === 1 ? 'tarea pendiente' : 'tareas pendientes'
    } para hoy. Respeta tus ritmos y tiempos de descanso.`;
  } else {
    subtitle = `${userData.displayDate} · ¡Estás al día! No tienes tareas pendientes para hoy.`;
  }

  const todayPercent =
    metrics.todayTotal > 0
      ? Math.min(100, Math.round((metrics.todayCompleted / metrics.todayTotal) * 100))
      : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Cabecera dinámica */}
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-on-surface">
            {userData.saludo}, {userData.displayName}!
          </h1>
          <Coffee className="size-8 text-accent-amber shrink-0" />
        </div>
        <p className="mt-2 text-on-surface-variant max-w-2xl text-sm sm:text-base leading-relaxed">
          {subtitle}
        </p>
      </header>

      {/* Banner oficial: Komorebi - Sistema de Gestión de Calendarios con Google OAuth */}
      <section
        aria-label="Información de la plataforma Komorebi"
        className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-xs relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-amber/15 px-3 py-0.5 text-xs font-bold text-accent-amber uppercase tracking-wider">
                <Calendar className="size-3.5" />
                Komorebi
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                <ShieldCheck className="size-3 text-status-success" />
                Google OAuth
              </span>
            </div>
            <h2 className="text-lg font-bold text-primary">
              Komorebi — Sistema de Gestión de Calendarios con Google OAuth
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Esta aplicación es un sistema integral de gestión de calendarios con Google OAuth,
              diseñado para sincronizar eventos en tiempo real con Google Calendar, organizar
              bloques de estudio y gestionar proyectos académicos de manera segura.
            </p>
          </div>
          <Link
            href="/calendario"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Calendar className="size-3.5 text-accent-amber" />
            <span>Ver Calendario</span>
          </Link>
        </div>
      </section>

      {/* Grid de Métricas en Tiempo Real */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Tarjeta 1: Racha */}
        <Card className="p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <Badge variant="streak" className="self-start">
              Racha
            </Badge>
            <Flame className="size-4 text-status-streak" />
          </div>
          <div className="mt-1">
            <span className="text-3xl font-bold text-on-surface">
              {metrics.rachaActiva} {metrics.rachaActiva === 1 ? 'día' : 'días'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">
            {metrics.rachaActiva > 0
              ? `Mejor: ${metrics.rachaMaxima} ${metrics.rachaMaxima === 1 ? 'día' : 'días'} · ¡Hábito activo!`
              : 'Completa una tarea para encender tu racha'}
          </p>
        </Card>

        {/* Tarjeta 2: Esta semana */}
        <Card className="p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <Badge className="self-start">Esta semana</Badge>
            <Calendar className="size-4 text-outline" />
          </div>
          <div className="mt-1">
            <span className="text-3xl font-bold text-on-surface">
              {formatMinutes(metrics.weeklyMinutes)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-auto">
            <ProgressBar progress={metrics.weeklyProgressPercent} height="sm" />
            <span className="text-[10px] text-on-surface-variant font-semibold whitespace-nowrap">
              Meta {formatMinutes(metrics.weeklyTargetMinutes)}
            </span>
          </div>
        </Card>

        {/* Tarjeta 3: Progreso hoy */}
        <Card className="p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <Badge variant="success" className="self-start">
              Progreso hoy
            </Badge>
            <TrendingUp className="size-4 text-status-success" />
          </div>
          <div className="mt-1">
            <span className="text-3xl font-bold text-on-surface">
              {metrics.todayCompleted} / {metrics.todayTotal}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium">
            {metrics.todayTotal > 0
              ? `${todayPercent}% completado hoy`
              : 'Sin tareas programadas hoy'}
          </p>
        </Card>

        {/* Tarjeta 4: Ritmo Global */}
        <Card className="p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <Badge className="self-start">Ritmo Global</Badge>
            <ShieldCheck className="size-4 text-primary" />
          </div>
          <div className="mt-1">
            <span className="text-3xl font-bold text-on-surface">{metrics.globalProgress}%</span>
          </div>
          <p className="text-xs text-on-surface-variant font-medium truncate">
            {metrics.totalTasksCount > 0
              ? `${metrics.completedTasksCount} de ${metrics.totalTasksCount} tareas hechas`
              : 'Crea tu primer proyecto'}
          </p>
        </Card>
      </section>

      {/* Sección interactiva de Tareas por completar en el día actual */}
      <section>
        <HomeTaskList initialTasks={tasks} onTaskToggled={handleTaskToggled} />
      </section>

      {/* Sección de Proyectos en curso */}
      <HomeActiveProjects projects={projects} />
    </div>
  );
}
