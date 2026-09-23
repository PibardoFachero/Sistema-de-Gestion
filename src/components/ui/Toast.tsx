'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastMethods = React.useMemo(
    () => ({
      success: (message: string) => addToast(message, 'success'),
      error: (message: string) => addToast(message, 'error'),
      info: (message: string) => addToast(message, 'info'),
    }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      {/* Toast Floating Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 fade-in duration-300 ${
              t.type === 'error'
                ? 'bg-error-container/95 border-error/30 text-on-error-container'
                : t.type === 'success'
                  ? 'bg-surface-container-lowest/95 border-status-success/30 text-on-surface shadow-status-success/10'
                  : 'bg-surface-container-lowest/95 border-outline-variant/60 text-on-surface'
            }`}
          >
            {t.type === 'error' && <AlertCircle className="size-5 shrink-0 text-error mt-0.5" />}
            {t.type === 'success' && (
              <CheckCircle2 className="size-5 shrink-0 text-status-success mt-0.5" />
            )}
            {t.type === 'info' && <Info className="size-5 shrink-0 text-primary mt-0.5" />}

            <p className="flex-1 text-xs sm:text-sm font-medium leading-snug break-words">
              {t.message}
            </p>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-outline hover:text-on-surface transition-colors p-0.5 rounded-lg -mr-1 -mt-1"
              aria-label="Cerrar notificación"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return context.toast;
}
