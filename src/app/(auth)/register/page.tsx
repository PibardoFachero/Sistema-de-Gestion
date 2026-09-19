import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crear una cuenta | Komorebi Study Studio',
  description: 'Regístrate en Komorebi Study Studio para gestionar tus proyectos académicos y hábitos de estudio.',
};

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4 py-12 animate-in fade-in duration-500">
      <RegisterForm />
    </div>
  );
}
