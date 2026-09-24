'use client';

import { useEffect, useState, useCallback } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTourContext } from '@/contexts/TourContext';

export function useProjectDetailTour(isEmpty: boolean) {
  const [isReady, setIsReady] = useState(false);
  const { registerTour } = useTourContext();

  useEffect(() => {
    setIsReady(true);
  }, []);

  const startTour = useCallback((force = false) => {
    if (!isReady) return;

    const stepsEmpty: DriveStep[] = [
      {
        element: '#tour-project-header',
        popover: {
          title: 'Detalles del Proyecto',
          description: 'Aquí puedes ver el progreso de tu proyecto, editar sus detalles o modificar la fecha límite en cualquier momento.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-project-add-task-empty',
        popover: {
          title: 'Plan de Acción',
          description: 'Tu proyecto necesita tareas para avanzar. Puedes agregarlas manualmente o dejar que nuestra IA analice tus apuntes y cree las tareas por ti.',
          side: 'top',
          align: 'center',
        },
      }
    ];

    const stepsTasks: DriveStep[] = [
      {
        element: '#tour-project-header',
        popover: {
          title: 'Detalles del Proyecto',
          description: 'Aquí verás cómo la barra de progreso se llena automáticamente a medida que completas tus tareas.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-project-task-list',
        popover: {
          title: 'Tus Tareas',
          description: 'Esta es tu lista de tareas activas. Puedes marcarlas como completadas, editarlas o eliminarlas.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-project-add-task',
        popover: {
          title: 'Más Tareas',
          description: 'Agrega nuevas tareas en cualquier momento o pide ayuda a la IA para expandir tu plan de estudio.',
          side: 'top',
          align: 'center',
        },
      }
    ];

    const driverObj = driver({
      showProgress: true,
      steps: isEmpty ? stepsEmpty : stepsTasks,
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Entendido',
      progressText: '{{current}} de {{total}}',
    });

    driverObj.drive();
  }, [isReady, isEmpty]);

  // Register the tour with the global context whenever it changes
  useEffect(() => {
    if (isReady) {
      registerTour(startTour);
    }
  }, [isReady, registerTour, startTour]);

  return { startTour };
}
