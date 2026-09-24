'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type TourFunction = (force?: boolean) => void;

interface TourContextType {
  registerTour: (tourFn: TourFunction) => void;
  startCurrentTour: () => void;
  hasTour: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const [currentTourFn, setCurrentTourFn] = useState<TourFunction | null>(null);

  const registerTour = useCallback((tourFn: TourFunction) => {
    setCurrentTourFn(() => tourFn);
  }, []);

  const startCurrentTour = useCallback(() => {
    if (currentTourFn) {
      currentTourFn(true); // Always force when clicked manually
    }
  }, [currentTourFn]);

  return (
    <TourContext.Provider
      value={{
        registerTour,
        startCurrentTour,
        hasTour: currentTourFn !== null,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTourContext() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTourContext must be used within a TourProvider');
  }
  return context;
}
