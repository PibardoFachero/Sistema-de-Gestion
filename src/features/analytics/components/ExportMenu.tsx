'use client';

import { useState } from 'react';
import { Download, FileText, Image as ImageIcon, FileSpreadsheet, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalyticsDashboardData, AnalyticsMetricId } from '../data/types';
import { exportAsImage, exportAsPDF, exportAsExcel } from '../utils/exportUtils';

interface ExportMenuProps {
  data: AnalyticsDashboardData;
  activeMetric: AnalyticsMetricId;
}

export function ExportMenu({ data, activeMetric }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const metricTitles = {
    workload: 'Carga Planificada',
    progress: 'Progreso de Proyectos',
    priorities: 'Prioridades',
    deadlines: 'Próximas Entregas',
  };

  const handleExport = async (format: 'png' | 'pdf' | 'excel') => {
    setIsOpen(false);
    setIsExporting(true);

    try {
      const metricTitle = metricTitles[activeMetric];
      const seriesData = data.series[activeMetric];

      const response = await fetch('/api/ai/analytics-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricTitle,
          summary: data.summary,
          seriesData,
        }),
      });

      if (!response.ok) {
        throw new Error('Error obteniendo el reporte de la IA');
      }

      const { text: aiText } = await response.json();

      if (format === 'png') {
        await exportAsImage('exportable-chart-area', aiText, metricTitle);
      } else if (format === 'pdf') {
        await exportAsPDF('exportable-chart-area', aiText, metricTitle);
      } else if (format === 'excel') {
        await exportAsExcel(
          'exportable-chart-area',
          aiText,
          metricTitle,
          seriesData as unknown as Record<string, unknown>[],
        );
      }
    } catch (error) {
      console.error('Error durante la exportación:', error);
      alert('Hubo un error al generar el reporte. Revisa la consola o intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={cn(
          'flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          isExporting && 'opacity-70 cursor-not-allowed',
        )}
      >
        {isExporting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {isExporting ? 'Analizando con IA...' : 'Exportar Reporte'}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-outline-variant/40 bg-surface p-1 shadow-lg animate-in fade-in slide-in-from-top-2">
            <button
              onClick={() => handleExport('pdf')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-surface-container"
            >
              <FileText className="size-4 text-primary" />
              PDF Inteligente
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-surface-container"
            >
              <FileSpreadsheet className="size-4 text-status-success" />
              Reporte en Excel
            </button>
            <button
              onClick={() => handleExport('png')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-on-surface hover:bg-surface-container"
            >
              <ImageIcon className="size-4 text-secondary" />
              Imagen + Resumen (PNG)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
