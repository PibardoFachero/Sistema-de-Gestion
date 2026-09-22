'use client';

import React, { useState, useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Coffee, Play, Calendar, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface UpcomingTask {
  id: string;
  titulo: string;
  duracion: number | null;
  prioridad: string | null;
  fecha_inicio: string | null;
  project_titulo: string | null;
}

const miniChartData = [
  { day: 'L', value: 2 },
  { day: 'M', value: 3 },
  { day: 'X', value: 1 },
  { day: 'J', value: 4 },
  { day: 'V', value: 5 },
  { day: 'S', value: 2 },
  { day: 'D', value: 6 },
];

interface HomeDashboardClientProps {
  displayName: string;
  rachaActiva: number;
  upcomingTasks: UpcomingTask[];
  totalPendingTasks: number;
}

export function HomeDashboardClient({ displayName, rachaActiva, upcomingTasks, totalPendingTasks }: HomeDashboardClientProps) {
  const [greeting, setGreeting] = useState('¡Buenos días');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hour >= 12 && hour < 19) setGreeting('¡Buenas tardes');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else if (hour >= 19) setGreeting('¡Buenas noches');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else setGreeting('¡Buenos días');

    setCurrentDate(format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }));
  }, []);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.header variants={itemVariants}>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {greeting}, {displayName}!
          </h1>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
          >
            <Coffee className="size-8 text-outline" />
          </motion.div>
        </div>
        <p className="mt-2 text-on-surface-variant max-w-2xl">
          <span className="capitalize">{currentDate}</span>
          {' · '}
          {totalPendingTasks === 0
            ? 'No tienes tareas pendientes próximas. Disfruta tu tiempo libre o explora nuevos temas.'
            : totalPendingTasks === 1
              ? 'Tienes 1 tarea pendiente en tu lista. Concéntrate y avanza a tu ritmo.'
              : `Tienes ${totalPendingTasks} tareas pendientes en tu lista. Respeta tus ritmos y tiempos de descanso.`}
        </p>
      </motion.header>

      {/* Banner Interactivo */}
      <motion.section
        variants={itemVariants}
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-surface-container-lowest to-primary/5 p-6 shadow-sm"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent-amber to-primary" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary uppercase tracking-wider">
                <Calendar className="size-3.5" />
                Komorebi
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                <ShieldCheck className="size-3 text-status-success" />
                Google OAuth
              </span>
            </div>
            <h2 className="text-lg font-bold text-on-surface">
              Tu centro de operaciones académico
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Sincroniza tus eventos en tiempo real con Google Calendar, organiza bloques de estudio
              y gestiona proyectos con IA integrada.
            </p>
          </div>
          <Link href="/calendario">
            <Button variant="primary" className="shrink-0 gap-2 shadow-md hover:shadow-lg transition-shadow">
              <Calendar className="size-4 text-accent-amber" />
              <span>Ver Calendario</span>
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Stats Grid */}
      <motion.section variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants} whileHover={{ y: -5 }}>
          <Card className="p-4 flex flex-col gap-2 h-full shadow-sm hover:shadow-md transition-shadow">
            <Badge variant="streak" className="self-start">
              Racha
            </Badge>
            <div className="mt-2">
              <span className="text-3xl font-bold">
                {rachaActiva} {rachaActiva === 1 ? 'día' : 'días'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-auto">Hábito consolidado</p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5 }}>
          <Card className="p-4 flex flex-col gap-2 h-full shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <Badge className="self-start relative z-10">Esta semana</Badge>
            <div className="mt-2 relative z-10">
              <span className="text-3xl font-bold">14h 20m</span>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-16 opacity-30 pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={miniChartData}>
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
                  <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-2 mt-auto relative z-10">
              <ProgressBar progress={79} height="sm" />
              <span className="text-[10px] text-on-surface-variant font-medium whitespace-nowrap">
                Meta 18h
              </span>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5 }}>
          <Card className="p-4 flex flex-col gap-2 h-full shadow-sm hover:shadow-md transition-shadow">
            <Badge variant="success" className="self-start">
              Progreso hoy
            </Badge>
            <div className="mt-2">
              <span className="text-3xl font-bold">2 / 5</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-auto">40% completado</p>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ y: -5 }}>
          <Card className="p-4 flex flex-col gap-2 h-full shadow-sm hover:shadow-md transition-shadow">
            <Badge className="self-start">Ritmo Global</Badge>
            <div className="mt-2">
              <span className="text-3xl font-bold">88%</span>
            </div>
            <p className="text-xs text-status-success font-medium mt-auto flex items-center gap-1">
              <CheckCircle2 className="size-3" /> +4% vs semana ant.
            </p>
          </Card>
        </motion.div>
      </motion.section>

      {/* Tareas */}
      <motion.section variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Tareas de hoy</h2>
            <p className="text-sm text-on-surface-variant">
              {upcomingTasks.length === 0
                ? 'No tienes tareas pendientes para hoy.'
                : `${upcomingTasks.length} pendientes por abordar`}
            </p>
          </div>
          <Button variant="ghost" className="gap-2 text-sm">
            Ver todas <ArrowRight className="size-4" />
          </Button>
        </div>

        <motion.div variants={containerVariants} className="space-y-4">
          {upcomingTasks.map((task, index) => {
            const isPriority = task.prioridad?.toLowerCase() === 'prioritario' || task.prioridad?.toLowerCase() === 'alta';
            
            // Format time safely
            let formattedTime = 'Sin hora';
            if (task.fecha_inicio) {
              try {
                formattedTime = format(new Date(task.fecha_inicio), 'HH:mm a');
              } catch (e) {
                // Ignore parsing errors
              }
            }

            return (
              <motion.div key={task.id} variants={itemVariants} whileHover={{ scale: 1.005, x: 5 }}>
                <Card className={`p-0 overflow-hidden relative border-l-4 ${isPriority ? 'border-l-primary' : 'border-l-outline'} group shadow-sm hover:shadow-md transition-all`}>
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                  <div className="p-5 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={isPriority ? 'default' : undefined}>{task.project_titulo || 'Sin proyecto'}</Badge>
                        {isPriority && <Badge variant="priority">Prioritario</Badge>}
                      </div>
                      {index === 0 && <span className="text-xs font-semibold text-accent-amber">Siguiente turno</span>}
                    </div>

                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
                      {task.titulo}
                    </h3>

                    <div className="flex items-center gap-4 mt-4 text-sm text-on-surface-variant">
                      <span className="flex items-center gap-1.5">
                        <span className="font-semibold text-on-surface">{formattedTime}</span>
                      </span>
                      <span className="flex items-center gap-1.5">{task.duracion ? `${task.duracion} min` : '--'}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-6">
                      <Button variant={isPriority ? 'primary' : 'secondary'} className={`ml-auto gap-2 ${isPriority ? 'group-hover:scale-105 transition-transform' : 'group-hover:bg-primary group-hover:text-on-primary transition-colors'}`}>
                        Iniciar tarea <Play className={`size-4 fill-current ${!isPriority && 'group-hover:text-on-primary'}`} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}

          {upcomingTasks.length === 0 && (
            <motion.div variants={itemVariants}>
              <Card className="p-8 text-center border-dashed flex flex-col items-center justify-center text-on-surface-variant gap-3">
                <CheckCircle2 className="size-8 text-status-success/50" />
                <p>¡Todo al día! Has completado tus tareas o no tienes nada programado para hoy.</p>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
