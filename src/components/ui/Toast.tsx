'use client';

import React, { createContext, useContext } from 'react';

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const noop = () => {};

const defaultToast = {
  success: noop,
  error: noop,
  info: noop,
};

const ToastContext = createContext<ToastContextType>({ toast: defaultToast });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <ToastContext.Provider value={{ toast: defaultToast }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  return context.toast;
}
