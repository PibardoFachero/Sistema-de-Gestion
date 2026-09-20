import { Plus } from 'lucide-react';
import Link from 'next/link';

export default function ProyectosPage() {
  return (
    <div className="flex h-full min-h-[80vh] flex-col animate-in fade-in duration-500">
      {/* Botón superior izquierdo */}
      <div className="mb-8 flex items-start">
        <Link href="/proyectos/nuevo" className="flex items-center gap-2 rounded-2xl bg-surface-container-high px-5 py-2.5 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-surface-container-highest">
          <Plus className="size-4" />
          Crear Proyecto
        </Link>
      </div>

      {/* Contenido Central (Empty State) */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-8 flex h-[200px] w-[200px] items-center justify-center overflow-hidden border-4 bg-surface-container-lowest animate-morph-glow">
          <video
            src="/images/mascot/mrChiwiVideo.mp4"
            loop
            muted
            autoPlay
            playsInline
            disablePictureInPicture
            className="h-full w-full object-cover"
          />
        </div>
        <h1 className="mb-3 text-3xl font-bold text-on-surface">¡Empieza tu nuevo proyecto!</h1>
        <p className="max-w-md text-on-surface-variant">
          Crea tu primer espacio de estudio o trabajo y organiza todas tus tareas de forma sencilla.
        </p>
      </div>
    </div>
  );
}
