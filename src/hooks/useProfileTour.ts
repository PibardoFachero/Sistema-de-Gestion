'use client';

import { useEffect, useState, useCallback } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTourContext } from '@/contexts/TourContext';

export function useProfileTour() {
  const [isReady, setIsReady] = useState(false);
  const { registerTour } = useTourContext();

  useEffect(() => {
    setIsReady(true);
  }, []);

  const startTour = useCallback((force = false) => {
    if (!isReady) return;

    const steps: DriveStep[] = [
      {
        element: '#tour-profile-identity',
        popover: {
          title: 'Tu Identidad en Komorebi',
          description: 'Aquí puedes personalizar tu nombre, nombre de usuario y foto de perfil. Toca "Editar" para ajustar esta información y tus ajustes de seguridad de la cuenta.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-profile-learning',
        popover: {
          title: 'Preferencias de Aprendizaje',
          description: 'Ajusta tu metodología, ritmo, áreas prioritarias y disponibilidad. Usamos esta información para adaptar las sugerencias de Komo a tu estilo de estudio.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-profile-privacy',
        popover: {
          title: 'Términos y Privacidad',
          description: 'Aquí puedes consultar las condiciones de uso de Komorebi y nuestra política de privacidad.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-profile-stats',
        popover: {
          title: 'Tu Espacio de Aprendizaje',
          description: 'Accesos directos a tus temas y proyectos, además de tu nivel actual, rachas de estudio e hitos desbloqueados.',
          side: 'top',
          align: 'center',
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
