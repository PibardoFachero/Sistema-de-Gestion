'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useTourContext } from '@/contexts/TourContext';

export function GlobalHelpButton() {
  const { hasTour, startCurrentTour } = useTourContext();

  if (!hasTour) return null;

  return (
    <button
      onClick={startCurrentTour}
      aria-label="Ayuda de la página"
      className="p-1.5 md:p-2 text-outline hover:text-primary transition-colors cursor-pointer rounded-full hover:bg-primary/5 flex items-center justify-center shrink-0"
    >
      <HelpCircle className="size-5 md:size-6" />
    </button>
  );
}
