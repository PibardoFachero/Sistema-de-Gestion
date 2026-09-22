'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChiguiGreeting } from '@/components/mascot/ChiguiGreeting';
import { requestPasswordReset } from '@/features/auth/actions/requestPasswordResetAction';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldError(null);
    setGeneralError(null);
    setIsLoading(true);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const response = await requestPasswordReset({ email }, origin);

      if (!response.success) {
        if (response.fieldErrors?.email?.[0]) {
          setFieldError(response.fieldErrors.email[0]);
        }
        setGeneralError(response.error || 'No se pudo enviar el correo.');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setResendCooldown(60);
      setIsLoading(false);
    } catch {
      setGeneralError('Ocurrió un error inesperado al enviar el correo.');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setGeneralError(null);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const response = await requestPasswordReset({ email }, origin);

      if (!response.success) {
        setGeneralError(response.error || 'No se pudo reenviar el correo.');
        setIsLoading(false);
        return;
      }

      setResendCooldown(60);
      setIsLoading(false);
    } catch {
      setGeneralError('Error al reenviar el correo.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full p-8 sm:p-10 bg-surface-container-lowest border-outline-variant/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex flex-col items-center text-center mb-8">
        <ChiguiGreeting
          priority
          className="mb-4 h-20 w-20 object-contain motion-safe:animate-[chigui-float_4s_ease-in-out_infinite] lg:hidden"
        />
        <div className="hidden lg:flex size-12 items-center justify-center rounded-2xl bg-accent-amber/15 text-accent-amber mb-4">
          <Mail className="size-6" />
        </div>
        <h1 className="text-2xl font-bold text-primary mb-1.5 tracking-tight">
          Recuperar Contraseña
        </h1>
        <p className="text-sm text-on-surface-variant font-medium max-w-sm">
          Ingresa el correo electrónico asociado a tu cuenta para recibir un enlace de
          restablecimiento
        </p>
      </div>

      {isSuccess ? (
        <div className="flex flex-col items-center text-center py-4 animate-in fade-in">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-status-success-bg text-status-success shadow-inner">
            <CheckCircle2 className="size-8" />
          </div>

          <h2 className="text-xl font-bold text-primary mb-2">¡Correo enviado!</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-4 max-w-sm">
            Hemos enviado las instrucciones para restablecer tu contraseña a:
          </p>

          <div className="w-full bg-surface rounded-xl p-3 border border-outline-variant/40 mb-5 font-semibold text-sm text-primary break-all">
            {email}
          </div>

          <div className="w-full bg-accent-amber/10 border border-accent-amber/20 rounded-xl p-3.5 mb-6 text-xs text-on-surface-variant text-left leading-relaxed">
            <p className="font-semibold text-on-surface mb-1">¿No ves el correo?</p>
            <p>
              Revisa tu carpeta de spam o correo no deseado. Puede tardar un par de minutos en
              llegar.
            </p>
          </div>

          <div className="w-full space-y-3">
            <Link href="/login" className="w-full block">
              <Button
                variant="primary"
                className="w-full h-11 rounded-xl font-semibold text-sm shadow-md"
              >
                Volver al inicio de sesión
              </Button>
            </Link>

            <button
              type="button"
              disabled={resendCooldown > 0 || isLoading}
              onClick={handleResend}
              className="w-full text-xs font-semibold text-accent-amber hover:underline disabled:opacity-50 disabled:cursor-not-allowed py-1 transition-opacity flex items-center justify-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Reenviando...</span>
                </>
              ) : resendCooldown > 0 ? (
                <span>Reenviar correo en {resendCooldown}s</span>
              ) : (
                <span>¿No recibiste el enlace? Enviar de nuevo</span>
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          {generalError && (
            <div className="mb-4 flex items-start gap-3 rounded-xl bg-error-container p-3.5 text-on-error-container text-xs sm:text-sm animate-in fade-in">
              <AlertCircle className="size-5 shrink-0 text-error mt-0.5" />
              <p className="leading-snug">{generalError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
            <div className="space-y-1.5">
              <label
                className="text-sm font-semibold text-on-surface ml-1"
                htmlFor="recovery-email"
              >
                Correo electrónico
              </label>
              <input
                id="recovery-email"
                type="email"
                name="email"
                placeholder="tu@correo.universidad.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(null);
                  if (generalError) setGeneralError(null);
                }}
                disabled={isLoading}
                required
                className={`w-full rounded-xl border bg-surface px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/60 focus:bg-surface-container-lowest focus:outline-none transition-all shadow-sm ${
                  fieldError
                    ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
                    : 'border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
                }`}
              />
              {fieldError && <p className="text-xs text-error mt-1 ml-1">{fieldError}</p>}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full h-11 rounded-xl shadow-md hover:shadow-lg transition-all font-semibold text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Enviando enlace...</span>
                  </>
                ) : (
                  'Enviar enlace de recuperación'
                )}
              </Button>
            </div>
          </form>

          <div className="relative z-10 mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Volver a iniciar sesión</span>
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}
