import { BarChart2 } from 'lucide-react';

export default function AnaliticaPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-in fade-in duration-500">
      <div className="bg-surface-container rounded-full p-6 mb-6">
        <BarChart2 className="size-12 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-on-surface mb-2">Analítica</h1>
      <p className="text-on-surface-variant max-w-md">
        Estamos preparando tus estadísticas. Muy pronto podrás ver tu diagrama de Gantt y rachas de estudio.
      </p>
      <div className="mt-8 px-4 py-2 bg-accent-amber/20 text-primary font-semibold rounded-full text-sm">
        En proceso...
      </div>
    </div>
  );
}
