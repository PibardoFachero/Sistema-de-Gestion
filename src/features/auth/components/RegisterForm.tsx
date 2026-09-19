'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { registerUser } from '@/features/auth/actions/registerAction';
import { createClient } from '@/lib/supabase/client';
import type { RegisterFormData } from '@/features/auth/types/auth.types';

export function RegisterForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Limpiar error del campo que se está editando
    if (fieldErrors[name as keyof RegisterFormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (generalError) {
      setGeneralError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Validación rápida en frontend de coincidencia de contraseñas
    if (formData.password !== formData.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: 'Las contraseñas no coinciden',
      }));
      return;
    }

    setIsLoading(true);

    try {
      const response = await registerUser(formData);

      if (!response.success) {
        if (response.fieldErrors) {
          const mappedErrors: Partial<Record<keyof RegisterFormData, string>> = {};
          for (const [field, messages] of Object.entries(response.fieldErrors)) {
            if (messages && messages.length > 0) {
              mappedErrors[field as keyof RegisterFormData] = messages[0];
            }
          }
          setFieldErrors(mappedErrors);
        }

        if (response.error) {
          setGeneralError(response.error);
        }
        setIsLoading(false);
        return;
      }

      // Registro exitoso -> Redirigir a la encuesta de bienvenida (onboarding)
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/onboarding');
        router.refresh();
      }, 1000);
    } catch {
      setGeneralError('Ocurrió un error inesperado. Por favor intenta de nuevo.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGeneralError(null);
    setIsGoogleLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding`,
        },
      });

      if (error) {
        setGeneralError(error.message || 'Error al conectar con Google.');
        setIsGoogleLoading(false);
      }
    } catch {
      setGeneralError('Ocurrió un error al intentar registrarse con Google.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full p-8 sm:p-10 bg-surface-container-lowest border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Encabezado e Ícono */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="lg:hidden mb-4 relative h-16 w-16">
          <Image
            src="/images/mascot/chigui-focus.png"
            alt="Chigüi Focus"
            fill
            sizes="64px"
            className="object-contain drop-shadow-sm"
          />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-1 tracking-tight">
          Crear una cuenta
        </h1>
        <p className="text-sm text-on-surface-variant font-medium max-w-sm">
          Completa tus datos para registrarte en Komorebi Study Studio
        </p>
      </div>

      {/* Alerta de Error General */}
      {generalError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-error-container p-3.5 text-on-error-container text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="size-5 shrink-0 text-error mt-0.5" />
          <p className="leading-snug">{generalError}</p>
        </div>
      )}

      {/* Alerta de Éxito */}
      {isSuccess && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-status-success-bg p-4 text-status-success text-sm font-medium animate-in fade-in">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>¡Cuenta creada con éxito! Redirigiendo a tu encuesta inicial...</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
        {/* Nombre y Apellido (Grid de 2 columnas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface ml-1" htmlFor="firstName">
              Nombre
            </label>
            <input
              id="firstName"
              type="text"
              name="firstName"
              placeholder="Ej. Juan"
              value={formData.firstName}
              onChange={handleChange}
              disabled={isLoading || isSuccess}
              required
              className={`w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all shadow-sm ${fieldErrors.firstName
                ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
                : 'border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
            />
            {fieldErrors.firstName && (
              <p className="text-xs text-error mt-1 ml-1">{fieldErrors.firstName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-on-surface ml-1" htmlFor="lastName">
              Apellido
            </label>
            <input
              id="lastName"
              type="text"
              name="lastName"
              placeholder="Ej. Pérez"
              value={formData.lastName}
              onChange={handleChange}
              disabled={isLoading || isSuccess}
              required
              className={`w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all shadow-sm ${fieldErrors.lastName
                ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
                : 'border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
            />
            {fieldErrors.lastName && (
              <p className="text-xs text-error mt-1 ml-1">{fieldErrors.lastName}</p>
            )}
          </div>
        </div>

        {/* Nombre de usuario */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface ml-1" htmlFor="username">
            Nombre de usuario
          </label>
          <input
            id="username"
            type="text"
            name="username"
            placeholder="ej. juanperez"
            value={formData.username}
            onChange={handleChange}
            disabled={isLoading || isSuccess}
            required
            className={`w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all shadow-sm ${fieldErrors.username
              ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
              : 'border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
          />
          {fieldErrors.username && (
            <p className="text-xs text-error mt-1 ml-1">{fieldErrors.username}</p>
          )}
        </div>

        {/* Correo electrónico */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface ml-1" htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="tu@correo.universidad.edu"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading || isSuccess}
            required
            className={`w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all shadow-sm ${fieldErrors.email
              ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
              : 'border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-error mt-1 ml-1">{fieldErrors.email}</p>
          )}
        </div>

        {/* Contraseña */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface ml-1" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading || isSuccess}
            required
            className={`w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all shadow-sm ${fieldErrors.password
              ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
              : 'border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
          />
          {fieldErrors.password && (
            <p className="text-xs text-error mt-1 ml-1">{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirmación de contraseña */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface ml-1" htmlFor="confirmPassword">
            Confirmación de contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={isLoading || isSuccess}
            required
            className={`w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all shadow-sm ${fieldErrors.confirmPassword
              ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
              : 'border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
              }`}
          />
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-error mt-1 ml-1">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {/* Botón Principal */}
        <div className="pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || isSuccess}
            className="w-full h-11 rounded-xl shadow-md hover:shadow-lg transition-all font-semibold text-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Creando cuenta...</span>
              </>
            ) : (
              'Registrarse'
            )}
          </Button>
        </div>

        {/* Separador */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-outline-variant/30 w-full" />
          <span className="bg-surface/80 backdrop-blur-sm px-3 text-xs text-on-surface-variant uppercase tracking-wider absolute font-medium rounded-full">
            o
          </span>
        </div>

        {/* Botón Secundario (Google) */}
        <Button
          type="button"
          variant="secondary"
          disabled={isLoading || isSuccess || isGoogleLoading}
          onClick={handleGoogleSignIn}
          className="w-full h-11 flex items-center justify-center gap-2.5 rounded-xl bg-surface hover:bg-surface-dim border border-outline-variant/60 shadow-sm transition-all text-on-surface font-bold text-sm"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Conectando con Google...</span>
            </>
          ) : (
            <>
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
            </>
          )}
        </Button>
      </form>

      {/* Enlace inferior */}
      <div className="relative z-10 mt-8 text-center text-sm text-on-surface-variant font-medium">
        ¿Ya tienes una cuenta?{' '}
        <Link href="/login" className="text-primary font-bold hover:text-primary/80 transition-colors">
          Inicia sesión
        </Link>
      </div>
    </Card>
  );
}
