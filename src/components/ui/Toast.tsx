'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
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
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
        {toasts.map((t) => {
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-300 transition-all',
                t.type === 'success' && 'bg-surface-container-lowest border-status-success/30 text-on-surface ring-1 ring-status-success/20',
                t.type === 'error' && 'bg-surface-container-lowest border-error/30 text-on-surface ring-1 ring-error/20',
                t.type === 'info' && 'bg-surface-container-lowest border-outline-variant/60 text-on-surface ring-1 ring-primary/10'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {t.type === 'success' && <CheckCircle2 className="size-5 shrink-0 text-status-success" />}
                {t.type === 'error' && <AlertCircle className="size-5 shrink-0 text-error" />}
                {t.type === 'info' && <Info className="size-5 shrink-0 text-primary" />}
                <p className="line-clamp-2 text-xs leading-snug">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-outline hover:text-on-surface p-1 rounded-lg transition-colors"
                aria-label="Cerrar notificación"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}
