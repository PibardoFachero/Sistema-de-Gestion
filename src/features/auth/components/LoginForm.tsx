'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderKanban, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { loginUser } from '@/features/auth/actions/loginAction';
import { createClient } from '@/lib/supabase/client';
import type { LoginFormData } from '@/features/auth/types/auth.types';

export function LoginForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [generalError, setGeneralError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'oauth_error') {
        return 'No se pudo iniciar sesión con Google. Por favor intenta nuevamente.';
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name as keyof LoginFormData]) {
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
    setIsLoading(true);

    try {
      const response = await loginUser(formData);

      if (!response.success) {
        if (response.fieldErrors) {
          const mappedErrors: Partial<Record<keyof LoginFormData, string>> = {};
          for (const [field, messages] of Object.entries(response.fieldErrors)) {
            if (messages && messages.length > 0) {
              mappedErrors[field as keyof LoginFormData] = messages[0];
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

      // Inicio de sesión exitoso -> Redirigir a la página principal
      router.push('/');
      router.refresh();
    } catch {
      setGeneralError('Ocurrió un error inesperado al iniciar sesión.');
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
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        setGeneralError(error.message || 'Error al conectar con Google.');
        setIsGoogleLoading(false);
      }
    } catch {
      setGeneralError('Ocurrió un error al intentar iniciar sesión con Google.');
      setIsGoogleLoading(false);
    }
  };

  const isAnyLoading = isLoading || isGoogleLoading;

  return (
    <Card className="w-full max-w-md p-8 sm:p-10 shadow-[0_4px_24px_-2px_rgba(74,53,37,0.06),0_2px_8px_-1px_rgba(74,53,37,0.03)] border-outline-variant/40">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="bg-primary/10 p-3 rounded-xl text-primary mb-4 flex items-center justify-center">
          <FolderKanban className="size-8" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-1 tracking-tight">
          Bienvenido de vuelta
        </h1>
        <p className="text-sm text-on-surface-variant">
          Inicia sesión para continuar en Komorebi Study Studio
        </p>
      </div>

      {generalError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-error-container p-3.5 text-on-error-container text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="size-5 shrink-0 text-error mt-0.5" />
          <p className="leading-snug">{generalError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-on-surface" htmlFor="email">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="tu@correo.universidad.edu"
            value={formData.email}
            onChange={handleChange}
            disabled={isAnyLoading}
            required
            className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/70 focus:outline-none transition-colors ${
              fieldErrors.email
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary'
            }`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-error mt-1">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-on-surface" htmlFor="password">
              Contraseña
            </label>
            <span className="text-xs text-accent-amber font-medium cursor-pointer hover:underline">
              ¿Olvidaste tu contraseña?
            </span>
          </div>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            disabled={isAnyLoading}
            required
            className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/70 focus:outline-none transition-colors ${
              fieldErrors.password
                ? 'border-error focus:border-error focus:ring-1 focus:ring-error'
                : 'border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary'
            }`}
          />
          {fieldErrors.password && (
            <p className="text-xs text-error mt-1">{fieldErrors.password}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={isAnyLoading}
            className="w-full h-11 rounded-[25px] font-semibold text-sm shadow-sm hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </Button>
        </div>

        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-outline-variant/40 w-full" />
          <span className="bg-surface-container-lowest px-3 text-xs text-on-surface-variant uppercase tracking-wider absolute font-medium">
            o
          </span>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={isAnyLoading}
          onClick={handleGoogleSignIn}
          className="w-full h-11 rounded-[25px] flex items-center justify-center gap-2.5 bg-surface-dim hover:bg-surface-variant text-on-surface border border-outline-variant/60 font-medium text-sm transition-all"
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

      <div className="mt-8 text-center text-xs text-on-surface-variant">
        ¿No tienes una cuenta?{' '}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          Regístrate
        </Link>
      </div>
    </Card>
  );
}
