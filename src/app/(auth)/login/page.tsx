import { LoginForm } from '@/features/auth/components/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión | Komorebi Study Studio',
  description:
    'Inicia sesión en Komorebi Study Studio para continuar con tus sesiones y proyectos de estudio.',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4 animate-in fade-in duration-500">
      <LoginForm />
    </div>
  );
}
