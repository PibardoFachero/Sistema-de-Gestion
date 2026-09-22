'use client';

import React, { useEffect } from 'react';
import { X, CalendarX, Sparkles, Clock, ArrowRight } from 'lucide-react';

interface ImpossibleDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  motivo?: string;
  tiempoMinimo?: string;
}

export function ImpossibleDateModal({
  isOpen,
  onClose,
  message,
  motivo,
  tiempoMinimo,
}: ImpossibleDateModalProps) {
  // Manejo de la tecla Escape para cerrar el modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const displayMessage =
    motivo ||
    message ||
    'Es imposible realizar el proyecto en el tiempo límite indicado. Se necesita más tiempo para alcanzar este objetivo.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="impossible-date-title"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200 border border-[#E8DCD1]">
        {/* Botón cerrar X en la esquina superior derecha */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          aria-label="Cerrar recuadro emergente"
        >
          <X className="size-5" />
        </button>

        {/* Ícono de advertencia de fecha con estética cálida */}
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 mb-4">
          <CalendarX className="size-6 text-amber-600" />
        </div>

        {/* Badge de Komo IA */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF3EC] border border-[#E8DCD1] text-xs font-semibold text-[#845326] mb-3">
          <Sparkles className="size-3.5 text-[#845326]" />
          <span>Evaluación de Komo IA</span>
        </div>

        {/* Título */}
        <h3
          id="impossible-date-title"
          className="text-xl font-bold text-[#2C1F14] mb-2 leading-tight"
        >
          Fecha límite no viable
        </h3>

        {/* Explicación pedagógica de la IA */}
        <div className="p-4 bg-[#FAF7F4] border border-[#EAE3DC] rounded-2xl text-xs sm:text-sm text-[#433022] leading-relaxed mb-4">
          <p>{displayMessage}</p>
        </div>

        {/* Tiempo mínimo recomendado si la IA lo calculó */}
        {tiempoMinimo && (
          <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium mb-4 flex items-center gap-2">
            <Clock className="size-4 text-amber-600 shrink-0" />
            <span>
              <strong>Tiempo mínimo estimado por la IA:</strong> {tiempoMinimo}
            </span>
          </div>
        )}

        <p className="text-xs text-gray-500 mb-6 leading-normal">
          Te hemos redirigido a la selección de fecha límite para que puedas elegir un plazo más
          amplio y alcanzar tu objetivo con éxito.
        </p>

        {/* Botón de acción para cerrar y ajustar fecha */}
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-[#2C1F14] hover:bg-[#433022] text-white px-5 py-3.5 font-semibold text-sm transition-all shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Ajustar fecha límite</span>
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
