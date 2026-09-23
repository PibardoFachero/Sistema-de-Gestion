'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TelegramBotWidgetProps {
  username?: string;
  botUrl?: string;
}

export function TelegramBotWidget({ username, botUrl }: TelegramBotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const rawBotUrl =
    botUrl || process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/aulaverify_bot';

  // Normalizar el nombre de usuario para el parámetro deep-link de Telegram (máx 64 caracteres)
  const safeUsername = (username || 'usuario').trim();
  const userParam = safeUsername.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);

  let finalUrl = rawBotUrl;
  try {
    const url = new URL(rawBotUrl.startsWith('http') ? rawBotUrl : `https://${rawBotUrl}`);
    url.searchParams.set('start', userParam);
    finalUrl = url.toString();
  } catch {
    const separator = rawBotUrl.includes('?') ? '&' : '?';
    finalUrl = `${rawBotUrl}${separator}start=${encodeURIComponent(userParam)}`;
  }

  function handleOpenTelegram() {
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
  }

  // Cerrar al hacer clic fuera del widget
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar con la tecla Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <aside
      ref={widgetRef}
      aria-label="Asistente de Telegram"
      className="fixed bottom-20 md:bottom-8 right-5 md:right-8 z-50 flex flex-col items-end pointer-events-auto"
    >
      {/* Recuadro flotante con la información del bot adaptado a la paleta del sistema */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="mb-3 w-[calc(100vw-2.5rem)] sm:w-96 max-w-sm rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-2xl shadow-primary/10 backdrop-blur-md"
          >
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <TelegramIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Bot Asistente</h3>
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    @{safeUsername}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar panel de Telegram"
                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Descripción */}
            <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
              Interactúa con nuestro bot para consultar el estado de tus proyectos, gestionar tareas
              pendientes y recibir apoyo académico. Tu cuenta se vinculará de forma automática al
              iniciar el chat.
            </p>

            {/* Botón de acción */}
            <div className="mt-4 pt-3 border-t border-outline-variant/40">
              <Button
                type="button"
                onClick={handleOpenTelegram}
                className="w-full inline-flex items-center justify-center gap-2"
              >
                <TelegramIcon className="size-4" />
                <span>Abrir como @{safeUsername}</span>
                <ArrowUpRight className="size-4 opacity-75" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón circular flotante (sin efecto parpadeante, armonizado con los colores de la app) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Abrir asistente de Telegram"
        className="group relative flex size-12 md:size-13 items-center justify-center rounded-full border border-primary-container/40 bg-primary text-on-primary shadow-xl shadow-primary/25 transition-all duration-300 hover:scale-105 hover:bg-primary-container hover:shadow-2xl hover:shadow-primary/35 active:scale-95 cursor-pointer"
      >
        <TelegramIcon className="size-5 md:size-6 text-on-primary transition-transform duration-300 group-hover:scale-110" />

        {/* Tooltip accesible al pasar el cursor si está cerrado */}
        {!isOpen && (
          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-outline-variant/40 bg-surface-container-highest px-2.5 py-1 text-xs font-semibold text-on-surface shadow-md md:block opacity-0 transition-opacity group-hover:opacity-100">
            Bot de Telegram
          </span>
        )}
      </button>
    </aside>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.672c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.446z" />
    </svg>
  );
}
