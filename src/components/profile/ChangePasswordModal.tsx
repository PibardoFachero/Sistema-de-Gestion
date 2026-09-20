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
  KeyRound,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { changePassword } from '@/features/profile/actions/changePasswordAction';
import { requestPasswordReset } from '@/features/auth/actions/requestPasswordResetAction';
import { changePasswordSchema } from '@/features/profile/schemas/changePasswordSchema';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  isGoogleUser?: boolean;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  email,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Manejo de cuenta regresiva de reenvío de correo
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Tecla Escape para cerrar modal
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
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setGeneralError(null);
      setIsSuccess(false);
      setEmailSentSuccess(false);
    }
  }

  if (!isOpen) return null;

  // Validaciones en tiempo real
  const hasCurrentPassword = currentPassword.trim().length > 0;
  const hasMinLength = newPassword.length >= 6;
  const hasUpperCase = /[A-Z\p{Lu}]/u.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^a-zA-Z0-9\s\p{L}]/u.test(newPassword);
  const isDifferentFromCurrent = newPassword.length > 0 && currentPassword.length > 0 && newPassword !== currentPassword;
  const isNewPasswordValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = hasCurrentPassword && isNewPasswordValid && passwordsMatch && isDifferentFromCurrent && !isSubmitting;

  // Actualización de contraseña directa (verificando la actual)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);

    const validation = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const flattened = validation.error.flatten().fieldErrors;
      const errorMsg =
        flattened.currentPassword?.[0] ||
        flattened.newPassword?.[0] ||
        flattened.confirmPassword?.[0] ||
        'Por favor completa correctamente todos los campos.';
      setGeneralError(errorMsg);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (!response.success) {
        setGeneralError(response.error || 'No se pudo actualizar la contraseña.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);
    } catch {
      setGeneralError('Ocurrió un error inesperado al actualizar la contraseña.');
      setIsSubmitting(false);
    }
  };

  // Envío de correo de recuperación (solo para cuentas con proveedor email que olvidaron su contraseña actual)
  const handleSendEmail = async () => {
    if (isSendingEmail || resendCooldown > 0) return;
    setIsSendingEmail(true);
    setGeneralError(null);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const response = await requestPasswordReset({ email }, origin);

      if (!response.success) {
        setGeneralError(response.error || 'No se pudo enviar el correo de restablecimiento.');
        setIsSendingEmail(false);
        return;
      }

      setEmailSentSuccess(true);
      setResendCooldown(60);
      setIsSendingEmail(false);
    } catch {
      setGeneralError('Ocurrió un error inesperado al enviar la solicitud.');
      setIsSendingEmail(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-modal-title"
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
          /* Vista de Éxito */
          <div className="flex flex-col items-center text-center py-2 animate-in fade-in duration-300">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-status-success-bg text-status-success shadow-inner">
              <CheckCircle2 className="size-8" />
            </div>

            <h2
              id="change-password-modal-title"
              className="text-xl sm:text-2xl font-bold text-primary mb-2 tracking-tight"
            >
              ¡Contraseña actualizada!
            </h2>

            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              Tu contraseña ha sido cambiada exitosamente. Tu sesión se mantiene activa y puedes continuar trabajando en tu cuenta.
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
        ) : emailSentSuccess ? (
          /* Vista de Confirmación si solicitó enlace por correo */
          <div className="flex flex-col items-center text-center py-2 animate-in fade-in duration-300">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-status-success-bg text-status-success shadow-inner">
              <CheckCircle2 className="size-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-primary mb-2 tracking-tight">
              ¡Correo enviado!
            </h2>

            <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
              Hemos enviado las instrucciones y el enlace para restablecer tu contraseña a:
            </p>

            <div className="w-full flex items-center justify-center gap-2 bg-surface rounded-xl p-3 border border-outline-variant/40 mb-5 font-semibold text-sm text-primary break-all">
              <Mail className="size-4 shrink-0 text-outline" />
              <span>{email}</span>
            </div>

            <div className="w-full space-y-3">
              <Button
                type="button"
                variant="primary"
                onClick={onClose}
                className="w-full h-11 rounded-xl font-semibold text-sm shadow-md cursor-pointer"
              >
                Entendido
              </Button>

              <button
                type="button"
                disabled={resendCooldown > 0 || isSendingEmail}
                onClick={handleSendEmail}
                className="w-full text-xs font-semibold text-accent-amber hover:underline disabled:opacity-50 disabled:cursor-not-allowed py-1 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSendingEmail ? (
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
          /* Formulario: Contraseña actual + Nueva contraseña + Confirmación */
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <KeyRound className="size-5" />
              </div>
              <div>
                <h2
                  id="change-password-modal-title"
                  className="text-lg sm:text-xl font-bold text-primary tracking-tight"
                >
                  Cambiar contraseña
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Seguridad y acceso a tu cuenta
                </p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              Para cambiar tu contraseña, ingresa tu clave actual y define la nueva contraseña para tu cuenta (<span className="font-semibold text-on-surface">{email}</span>):
            </p>

            {generalError && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-error-container p-3 text-on-error-container text-xs">
                <AlertCircle className="size-4 shrink-0 text-error mt-0.5" />
                <p className="leading-snug">{generalError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Contraseña actual */}
              <div className="space-y-1">
                <label
                  className="text-xs font-semibold uppercase tracking-wide text-outline ml-0.5"
                  htmlFor="change-current-password"
                >
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    id="change-current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (generalError) setGeneralError(null);
                    }}
                    placeholder="Tu contraseña actual"
                    disabled={isSubmitting}
                    required
                    className="w-full rounded-xl border border-outline-variant/60 bg-surface px-3.5 py-2.5 pr-10 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    aria-label={showCurrentPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div className="space-y-1">
                <label
                  className="text-xs font-semibold uppercase tracking-wide text-outline ml-0.5"
                  htmlFor="change-new-password"
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="change-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (generalError) setGeneralError(null);
                    }}
                    placeholder="Mínimo 6 caracteres"
                    disabled={isSubmitting}
                    required
                    className="w-full rounded-xl border border-outline-variant/60 bg-surface px-3.5 py-2.5 pr-10 text-sm text-on-surface placeholder:text-outline/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    aria-label={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar nueva contraseña */}
              <div className="space-y-1">
                <label
                  className="text-xs font-semibold uppercase tracking-wide text-outline ml-0.5"
                  htmlFor="change-confirm-password"
                >
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="change-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (generalError) setGeneralError(null);
                    }}
                    placeholder="Repite la nueva contraseña"
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
                    {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Checklist de Requisitos de Contraseña */}
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                  Requisitos de la nueva contraseña:
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
                    <span className={hasMinLength ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
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
                    <span className={hasUpperCase ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
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
                    <span className={hasNumber ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
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
                    <span className={hasSpecialChar ? 'text-on-surface font-medium' : 'text-on-surface-variant'}>
                      Un carácter especial
                    </span>
                  </div>
                </div>

                {/* Validación: diferente de la actual */}
                {newPassword.length > 0 && currentPassword.length > 0 && (
                  <div className="pt-1 border-t border-outline-variant/30 flex items-center gap-1.5 text-xs">
                    <div
                      className={`flex size-4 items-center justify-center rounded-full transition-colors ${
                        isDifferentFromCurrent
                          ? 'bg-status-success-bg text-status-success'
                          : 'bg-status-error-bg text-status-error'
                      }`}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </div>
                    <span
                      className={
                        isDifferentFromCurrent ? 'text-on-surface font-medium' : 'text-status-error'
                      }
                    >
                      {isDifferentFromCurrent
                        ? 'Diferente de la contraseña actual'
                        : 'La nueva contraseña debe ser distinta a la actual'}
                    </span>
                  </div>
                )}

                {/* Validación: coincidencia */}
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
                    <span className={passwordsMatch ? 'text-status-success font-medium' : 'text-status-error'}>
                      {passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
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
                  disabled={isSubmitting || isSendingEmail}
                  className="h-10 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canSubmit || isSendingEmail}
                  className="h-10 px-5 text-xs font-semibold gap-2 shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="size-3.5" />
                      <span>Actualizar contraseña</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Opción de enviar enlace por correo para cambiar contraseña */}
              <div className="pt-3.5 border-t border-outline-variant/30 text-center">
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || isSubmitting || resendCooldown > 0}
                  className="text-xs text-accent-amber hover:underline cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  <Mail className="size-3.5" />
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Enviando enlace al correo...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <span>Reenviar enlace por correo en {resendCooldown}s</span>
                  ) : (
                    <span>¿Prefieres recibir un enlace por correo para cambiarla?</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
