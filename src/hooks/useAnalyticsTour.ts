'use client';

import { useEffect, useState, useCallback } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useTourContext } from '@/contexts/TourContext';

export function useAnalyticsTour() {
  const [isReady, setIsReady] = useState(false);
  const { registerTour } = useTourContext();

  useEffect(() => {
    setIsReady(true);
  }, []);

  const startTour = useCallback((force = false) => {
    if (!isReady) return;

    const steps: DriveStep[] = [
      {
        element: '#tour-analytics-tabs',
        popover: {
          title: 'Métricas Disponibles',
          description: 'Navega entre diferentes vistas para analizar tu progreso, carga de trabajo, prioridades y fechas de entrega.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#exportable-chart-area',
        popover: {
          title: 'Tus Datos Visualizados',
          description: 'Aquí verás el detalle gráfico de la métrica seleccionada. Pasa el cursor sobre los elementos para obtener más información puntual.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-analytics-ai',
        popover: {
          title: 'Consultar a la IA',
          description: 'Si tienes dudas sobre tus números o no sabes qué priorizar, puedes iniciar un chat con Komo pasándole exactamente el contexto de esta gráfica.',
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#tour-analytics-actions',
        popover: {
          title: 'Exportar Reporte',
          description: 'Usa este menú para descargar tu gráfica como imagen o exportar los datos en formato CSV para un registro externo.',
          side: 'left',
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
