import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function TemasPage() {
  return (
    <div className="animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-on-primary">
              <BookOpen className="size-4" />
            </span>
            Biblioteca personal
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Temas</h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Organiza las áreas que estás explorando y encuentra más fácilmente lo que quieres estudiar.
          </p>
        </div>
        <Button className="gap-2 self-start" type="button">
          <Plus className="size-4" />
          Nuevo tema
        </Button>
      </header>

      <Card className="mt-8 flex min-h-72 flex-col items-center justify-center border-dashed bg-surface-container-low/40 text-center shadow-none">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-container text-primary">
          <BookOpen className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold">Tus temas aparecerán aquí</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
          Crea un tema para reunir notas, recursos y sesiones de estudio de un mismo interés.
        </p>
      </Card>
    </div>
  );
}
