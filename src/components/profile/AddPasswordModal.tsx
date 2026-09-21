'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { addPassword } from '@/features/profile/actions/addPasswordAction';
import { resetPasswordSchema } from '@/features/auth/schemas/resetPasswordSchema';

interface AddPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onPasswordAdded: () => void;
}

export function AddPasswordModal({
  isOpen,
  onClose,
  email,
  onPasswordAdded,
}: AddPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Escuchar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setGeneralError(null);
      setIsSuccess(false);
    }
  }

  if (!isOpen) return null;

  // Validaciones en tiempo real
  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z\p{Lu}]/u.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^a-zA-Z0-9\s\p{L}]/u.test(password);
  const isPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = isPasswordValid && passwordsMatch && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);

    const validation = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const errorMsg =
        validation.error.flatten().fieldErrors.confirmPassword?.[0] ||
        validation.error.flatten().fieldErrors.password?.[0] ||
        'Por favor cumple con todos los requisitos de la contraseña.';
      setGeneralError(errorMsg);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await addPassword({ password, confirmPassword });

      if (!response.success) {
        setGeneralError(response.error || 'No se pudo agregar la contraseña.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);
      onPasswordAdded();
    } catch {
      setGeneralError('Ocurrió un error inesperado al establecer la contraseña.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-password-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 sm:p-8 border border-outline-variant/30 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
          aria-label="Cerrar modal"
        >
          <X className="size-5" />
        </button>

        {isSuccess ? (
          /* Vista de Éxito al agregar contraseña */
          <div className="flex flex-col items-center text-center py-2 animate-in fade-in duration-300">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-status-success-bg text-status-success shadow-inner">
              <CheckCircle2 className="size-8" />
            </div>

            <h2
              id="add-password-modal-title"
              className="text-xl sm:text-2xl font-bold text-primary mb-2 tracking-tight"
            >
              ¡Contraseña agregada!
            </h2>

            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              Tu contraseña ha sido guardada exitosamente. A partir de ahora podrás acceder a tu
              cuenta iniciando sesión tanto con Google como utilizando tu correo electrónico (
              <span className="font-semibold text-on-surface">{email}</span>) y tu nueva contraseña.
            </p>

            <Button
              type="button"
              variant="primary"
              onClick={onClose}
              className="w-full h-11 rounded-xl font-semibold text-sm shadow-md cursor-pointer"
            >
              Aceptar
            </Button>
          </div>
        ) : (
          /* Formulario para agregar contraseña */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h2
                  id="add-password-modal-title"
                  className="text-lg sm:text-xl font-bold text-primary tracking-tight"
                >
                  Agregar contraseña
                </h2>
                <p className="text-xs text-on-surface-variant">Cuenta vinculada con Google</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              Tu cuenta se registró con Google (
              <span className="font-semibold text-on-surface">{email}</span>). Define una contraseña
              para acceder también mediante correo y clave:
            </p>

            {generalError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-error-container p-3 text-on-error-container text-xs">
                <AlertCircle className="size-4 shrink-0 text-error mt-0.5" />
                <p className="leading-snug">{generalError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Nueva contraseña */}
              <div className="space-y-1">
                <label
                  className="text-xs font-semibold uppercase tracking-wide text-outline ml-0.5"
                  htmlFor="add-new-password"
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="add-new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (generalError) setGeneralError(null);
                    }}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    required
                    className="w-full rounded-xl border border-outline-variant/60 bg-surface px-3.5 py-2.5 pr-10 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1">
                <label
                  className="text-xs font-semibold uppercase tracking-wide text-outline ml-0.5"
                  htmlFor="add-confirm-password"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    id="add-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (generalError) setGeneralError(null);
                    }}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    required
                    className="w-full rounded-xl border border-outline-variant/60 bg-surface px-3.5 py-2.5 pr-10 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Checklist de Requisitos de Contraseña */}
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  Requisitos de seguridad:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex size-4 items-center justify-center rounded-full transition-colors ${
                        hasMinLength
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-outline-variant/40 text-outline'
                      }`}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                    <span
                      className={
                        hasMinLength ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                      }
                    >
                      Mínimo 6 caracteres
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex size-4 items-center justify-center rounded-full transition-colors ${
                        hasUpperCase
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-outline-variant/40 text-outline'
                      }`}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                    <span
                      className={
                        hasUpperCase ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                      }
                    >
                      Una letra mayúscula
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex size-4 items-center justify-center rounded-full transition-colors ${
                        hasNumber
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-outline-variant/40 text-outline'
                      }`}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                    <span
                      className={
                        hasNumber ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                      }
                    >
                      Al menos un número
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex size-4 items-center justify-center rounded-full transition-colors ${
                        hasSpecialChar
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-outline-variant/40 text-outline'
                      }`}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                    <span
                      className={
                        hasSpecialChar ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                      }
                    >
                      Un carácter especial
                    </span>
                  </div>
                </div>

                {confirmPassword.length > 0 && (
                  <div className="pt-1 border-t border-outline-variant/30 flex items-center gap-1.5 text-xs">
                    <div
                      className={`flex size-4 items-center justify-center rounded-full transition-colors ${
                        passwordsMatch
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-status-error-bg text-status-error'
                      }`}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                    <span
                      className={
                        passwordsMatch ? 'text-status-success font-medium' : 'text-status-error'
                      }
                    >
                      {passwordsMatch
                        ? 'Las contraseñas coinciden'
                        : 'Las contraseñas no coinciden'}
                    </span>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="h-10 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canSubmit}
                  className="h-10 px-5 text-xs font-semibold gap-2 shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="size-3.5" />
                      <span>Guardar contraseña</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
