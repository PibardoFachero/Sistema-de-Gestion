'use client';

import { useEffect, useState, useCallback } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTourContext } from '@/contexts/TourContext';

export function useIATour() {
  const [isReady, setIsReady] = useState(false);
  const { registerTour } = useTourContext();

  useEffect(() => {
    setIsReady(true);
  }, []);

  const startTour = useCallback((force = false) => {
    if (!isReady) return;

    const steps: DriveStep[] = [
      {
        element: '#tour-ia-input',
        popover: {
          title: 'Asistente IA Komo',
          description: 'Escribe aquí tus consultas. Puedes pedirle que cree tareas por ti o darle clic al clip de papel para subir PDFs o documentos que necesites que analice.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-ia-history',
        popover: {
          title: 'Tus Conversaciones',
          description: 'Komo guarda el historial de todo lo que han hablado para que puedas continuar cualquier tema pendiente.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '#tour-ia-new-chat',
        popover: {
          title: 'Nuevo Chat',
          description: 'Si necesitas empezar un tema nuevo sin arrastrar el contexto anterior, presiona este botón.',
          side: 'bottom',
          align: 'end',
        },
      }
    ];

    const driverObj = driver({
      showProgress: true,
      steps: steps,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Entendido',
      progressText: '{{current}} de {{total}}',
    });

    driverObj.drive();
  }, [isReady]);

  useEffect(() => {
    if (isReady) {
      registerTour(startTour);
    }
  }, [isReady, registerTour, startTour]);

  return { startTour };
}
