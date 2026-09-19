'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function RegisterForm() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    router.push('/onboarding');
  };

  return (
    <Card className="w-full max-w-lg p-8 sm:p-10 shadow-[0_4px_24px_-2px_rgba(74,53,37,0.06),0_2px_8px_-1px_rgba(74,53,37,0.03)] border-outline-variant/40">
      {/* Encabezado e Ícono */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="bg-primary/10 p-3 rounded-xl text-primary mb-4 flex items-center justify-center">
          <FolderKanban className="size-8" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-1 tracking-tight">
          Crear una cuenta
        </h1>
        <p className="text-sm text-on-surface-variant max-w-sm">
          Completa tus datos para registrarte en Komorebi Study Studio
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre y Apellido (Grid de 2 columnas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">
              Nombre
            </label>
            <input
              type="text"
              name="firstName"
              placeholder="Ej. Juan"
              required
              className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface">
              Apellido
            </label>
            <input
              type="text"
              name="lastName"
              placeholder="Ej. Pérez"
              required
              className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>

        {/* Nombre de usuario */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface">
            Nombre de usuario
          </label>
          <input
            type="text"
            name="username"
            placeholder="ej. juanperez"
            required
            className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Correo electrónico */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface">
            Correo electrónico
          </label>
          <input
            type="email"
            name="email"
            placeholder="tu@correo.universidad.edu"
            required
            className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Contraseña */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface">
            Contraseña
          </label>
          <input
            type="password"
            name="password"
            placeholder="••••••••"
            required
            className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Confirmación de contraseña */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface">
            Confirmación de contraseña
          </label>
          <input
            type="password"
            name="confirmPassword"
            placeholder="••••••••"
            required
            className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Botón Principal */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full h-11 rounded-[25px] font-semibold text-sm shadow-sm hover:brightness-110 active:scale-[0.99] transition-all"
          >
            Registrarse
          </Button>
        </div>

        {/* Separador */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-outline-variant/40 w-full" />
          <span className="bg-surface-container-lowest px-3 text-xs text-on-surface-variant uppercase tracking-wider absolute font-medium">
            o
          </span>
        </div>

        {/* Botón Secundario (Google) */}
        <Button
          type="button"
          variant="secondary"
          className="w-full h-11 rounded-[25px] flex items-center justify-center gap-2.5 bg-surface-dim hover:bg-surface-variant text-on-surface border border-outline-variant/60 font-medium text-sm transition-all"
        >
          <svg className="size-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar con Google</span>
        </Button>
      </form>

      {/* Enlace inferior */}
      <div className="mt-8 text-center text-xs text-on-surface-variant">
        ¿Ya tienes una cuenta?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Inicia sesión
        </Link>
      </div>
    </Card>
  );
}
