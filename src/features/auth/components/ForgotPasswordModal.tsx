'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { requestPasswordReset } from '@/features/auth/actions/requestPasswordResetAction';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function ForgotPasswordModal({
  isOpen,
  onClose,
  defaultEmail = '',
}: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus al montar/abrir el modal
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Manejar cuenta regresiva para reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Manejar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 sm:p-8 border border-outline-variant/30 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="size-5" />
        </button>

        {isSuccess ? (
          /* Vista de Confirmación de Envío */
          <div className="flex flex-col items-center text-center py-2 animate-in fade-in duration-300">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-status-success-bg text-status-success shadow-inner">
              <CheckCircle2 className="size-8" />
            </div>

            <h2
              id="forgot-password-title"
              className="text-xl sm:text-2xl font-bold text-primary mb-2 tracking-tight"
            >
              ¡Correo enviado!
            </h2>

            <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
              Hemos enviado las instrucciones y el enlace para restablecer tu contraseña a:
            </p>

            <div className="w-full bg-surface rounded-xl p-3 border border-outline-variant/40 mb-5 font-semibold text-sm text-primary break-all">
              {email}
            </div>

            <div className="w-full bg-accent-amber/10 border border-accent-amber/20 rounded-xl p-3.5 mb-6 text-xs text-on-surface-variant text-left leading-relaxed">
              <p className="font-semibold text-on-surface mb-1">¿No ves el correo?</p>
              <p>
                Revisa tu carpeta de spam o correo no deseado. Puede demorar un par de minutos en
                llegar.
              </p>
            </div>

            {generalError && (
              <div className="mb-4 w-full flex items-start gap-2.5 rounded-xl bg-error-container p-3 text-on-error-container text-xs text-left">
                <AlertCircle className="size-4 shrink-0 text-error mt-0.5" />
                <p>{generalError}</p>
              </div>
            )}

            <div className="w-full space-y-3">
              <Button
                type="button"
                variant="primary"
                onClick={onClose}
                className="w-full h-11 rounded-xl font-semibold text-sm shadow-md"
              >
                Volver al inicio de sesión
              </Button>

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
          /* Formulario de Solicitud */
          <div className="animate-in fade-in duration-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent-amber/15 text-accent-amber">
                <Mail className="size-5" />
              </div>
              <div>
                <h2
                  id="forgot-password-title"
                  className="text-lg sm:text-xl font-bold text-primary tracking-tight"
                >
                  ¿Olvidaste tu contraseña?
                </h2>
                <p className="text-xs text-on-surface-variant font-medium">
                  Recupera el acceso a tu cuenta
                </p>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant mb-5 leading-relaxed">
              Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para que
              puedas restablecer tu contraseña.
            </p>

            {generalError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-error-container p-3 text-on-error-container text-xs animate-in fade-in">
                <AlertCircle className="size-4 shrink-0 text-error mt-0.5" />
                <p className="leading-snug">{generalError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-password-email"
                  className="text-xs font-semibold text-on-surface ml-1"
                >
                  Correo electrónico
                </label>
                <input
                  ref={inputRef}
                  id="forgot-password-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError(null);
                    if (generalError) setGeneralError(null);
                  }}
                  placeholder="tu@correo.universidad.edu"
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

              <div className="pt-2 space-y-2.5">
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

                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Volver a iniciar sesión</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
