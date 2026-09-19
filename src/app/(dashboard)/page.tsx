import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Coffee, Play } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const displayName =
    user.user_metadata?.first_name ||
    user.user_metadata?.username ||
    user.user_metadata?.nombre_usuario ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Estudiante';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">¡Buenos días, {displayName}!</h1>
          <Coffee className="size-8 text-outline" />
        </div>
        <p className="mt-2 text-on-surface-variant max-w-2xl">
          Martes, 24 de Octubre de 2024 · Tienes 3 sesiones planificadas para hoy. Respeta tus ritmos y tiempos de descanso.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col gap-2">
          <Badge variant="streak" className="self-start">Racha</Badge>
          <div className="mt-2">
            <span className="text-3xl font-bold">12 días</span>
          </div>
          <p className="text-xs text-on-surface-variant">Hábito consolidado</p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <Badge className="self-start">Esta semana</Badge>
          <div className="mt-2">
            <span className="text-3xl font-bold">14h 20m</span>
          </div>
          <div className="flex items-center gap-2 mt-auto">
            <ProgressBar progress={79} height="sm" />
            <span className="text-[10px] text-on-surface-variant font-medium whitespace-nowrap">Meta 18h</span>
          </div>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <Badge variant="success" className="self-start">Progreso hoy</Badge>
          <div className="mt-2">
            <span className="text-3xl font-bold">2 / 5</span>
          </div>
          <p className="text-xs text-on-surface-variant">40% completado</p>
        </Card>

        <Card className="p-4 flex flex-col gap-2">
          <Badge className="self-start">Ritmo Global</Badge>
          <div className="mt-2">
            <span className="text-3xl font-bold">88%</span>
          </div>
          <p className="text-xs text-status-success font-medium">+4% vs semana ant.</p>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Tareas de hoy</h2>
            <p className="text-sm text-on-surface-variant">3 pendientes por abordar</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Tarea 1 */}
          <Card className="p-0 overflow-hidden relative border-l-4 border-l-primary">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge>Aprender Python desde cero</Badge>
                  <Badge variant="priority">Prioritario</Badge>
                </div>
                <span className="text-xs font-semibold text-accent-amber">Siguiente turno</span>
              </div>

              <h3 className="text-lg font-bold">Ejercicios prácticos de Listas y Diccionarios</h3>

              <div className="flex items-center gap-4 mt-4 text-sm text-on-surface-variant">
                <span className="flex items-center gap-1.5"><span className="font-semibold text-on-surface">10:30 AM</span></span>
                <span className="flex items-center gap-1.5">45 min</span>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button variant="primary" className="ml-auto gap-2">
                  Iniciar tarea <Play className="size-4 fill-current" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
