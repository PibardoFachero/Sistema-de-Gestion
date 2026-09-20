import { Metadata } from 'next';
import { CreateProjectWizard } from '@/features/proyectos/components/CreateProjectWizard';

export const metadata: Metadata = {
  title: 'Crear Nuevo Proyecto | Komorebi Study Studio',
  description: 'Asistente para la creación de un nuevo proyecto.',
};

export default function CrearProyectoPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center py-6 sm:py-12 animate-in fade-in duration-500"
      style={{ background: 'linear-gradient(135deg, #FFF8F3 0%, #FBE6DD 50%, #F5E8E0 100%)' }}
    >
      <CreateProjectWizard />
    </main>
  );
}
