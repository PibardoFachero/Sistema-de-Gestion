'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Download, Share2, Award, CheckCircle, Loader2, Clock, Calendar, ShieldCheck, Copy, Printer, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CertData {
  hash_sha256: string;
  fecha_emision: string;
  horas_invertidas: number;
  temas_aprobados: number;
  proyectos: { titulo: string };
  profiles: { nombre_completo: string };
  tareas?: { titulo: string }[];
}

export interface CertificateModalProps {
  hash?: string;
  isOpen: boolean;
  onClose: () => void;
  isPreview?: boolean;
  previewData?: {
    tituloProyecto: string;
    horasInvertidas: number;
    tareasAprobadas: { titulo: string }[];
    nombreCompleto: string;
  };
}

export function CertificateModal({ hash, isOpen, onClose, isPreview = false, previewData }: CertificateModalProps) {
  const supabase = createClient();
  const certRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (isPreview && previewData) {
      setData({
        hash_sha256: 'KMB-XXXX-PENDIENTE',
        fecha_emision: new Date().toISOString(),
        horas_invertidas: previewData.horasInvertidas,
        temas_aprobados: previewData.tareasAprobadas.length,
        proyectos: { titulo: previewData.tituloProyecto },
        profiles: { nombre_completo: previewData.nombreCompleto },
        tareas: previewData.tareasAprobadas
      });
      setLoading(false);
    } else if (hash) {
      setLoading(true);
      // Fetcheamos el certificado y las tareas del proyecto asociadas
      const fetchCert = async () => {
        const { data: cert, error } = await supabase
          .from('certificados_emitidos')
          .select(`
            project_id,
            hash_sha256,
            fecha_emision,
            horas_invertidas,
            temas_aprobados,
            proyectos ( titulo ),
            profiles ( nombre_completo )
          `)
          .eq('hash_sha256', hash)
          .single();

        if (cert && !error) {
          const { data: tareas } = await supabase
            .from('tareas')
            .select('titulo')
            .eq('project_id', cert.project_id)
            .eq('quiz_aprobado', true);

          setData({
            ...cert,
            tareas: tareas || []
          } as any);
        }
        setLoading(false);
      };
      fetchCert();
    }
  }, [isOpen, hash, isPreview, previewData, supabase]);

  const handleDownloadPDF = async () => {
    if (!certRef.current || isDownloading || !data || isPreview) return;
    try {
      setIsDownloading(true);
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FCF9F0'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificado_${data.proyectos.titulo.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF', error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPNG = async () => {
    if (!certRef.current || isDownloading || !data || isPreview) return;
    try {
      setIsDownloading(true);
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FCF9F0'
      });
      
      const link = document.createElement('a');
      link.download = `Certificado_${data.proyectos.titulo.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading PNG', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyHash = () => {
    if (!data?.hash_sha256 || isPreview) return;
    navigator.clipboard.writeText(data.hash_sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* Top Header - Solo cierre y título */}
      <div className="w-full h-14 bg-[#FCF9F0] text-[#2C1F14] flex justify-between items-center px-4 sm:px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-[#845326]" />
          <span className="font-bold text-sm sm:text-base">
            {isPreview ? 'Vista Previa del Certificado' : 'Certificado Oficial'}
          </span>
          <span className="hidden sm:inline-block text-[#845326] text-xs opacity-70 ml-2">
            Acreditación oficial de tiempo invertido • Komorebi
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#E8DCD1] transition-colors text-outline">
          <X className="size-5" />
        </button>
      </div>

      {/* Scrollable Document Area */}
      <div className="flex-1 w-full overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
        {loading || !data ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/70">
            <Loader2 className="size-8 animate-spin mb-4" />
            <p>Cargando documento...</p>
          </div>
        ) : (
          <div className="w-full max-w-[1050px] flex flex-col gap-4 relative">
            
            {/* The Certificate Frame */}
            <div 
              className="relative w-full aspect-[1.414/1] shadow-2xl overflow-hidden shrink-0"
              style={{ backgroundColor: '#FCF9F0' }}
            >
              {/* Contenedor exacto para html2canvas */}
              <div 
                ref={certRef}
                className="absolute inset-0 p-12 sm:p-16 border-[16px] border-[#F2EFE8]"
                style={{ backgroundColor: '#FCF9F0' }}
              >
                
                {/* Thin inner border */}
                <div className="absolute inset-[16px] border-2 border-[#E8DCD1] pointer-events-none" />
                <div className="absolute inset-[22px] border border-[#E8DCD1]/60 pointer-events-none" />

                {/* Watermark Logo */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                  <Award className="w-[400px] h-[400px] text-[#845326]" />
                </div>

                {isPreview && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <span className="transform -rotate-45 text-7xl font-black text-black/5 opacity-10">VISTA PREVIA</span>
                  </div>
                )}

                <div className="relative z-10 flex flex-col h-full items-center text-center">
                  
                  {/* Top Badge */}
                  <div className="mt-4 flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-bold text-[#845326] uppercase tracking-[0.2em] bg-[#F2EFE8] px-4 py-1.5 rounded-full mb-8 border border-[#E8DCD1]">
                    <Award className="size-3.5" />
                    <span>Komorebi Study Studio • Acreditación Académica</span>
                  </div>

                  {/* Main Title */}
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#2C1F14] tracking-widest mb-2 whitespace-nowrap">
                    CERTIFICADO DE INVERSIÓN DE TIEMPO
                  </h1>
                  <h2 className="text-[9px] sm:text-[11px] text-[#845326] uppercase tracking-[0.3em] mb-8">
                    Constancia Oficial de Dedicación y Cumplimiento de Metas
                  </h2>

                  {/* Presentación */}
                  <p className="italic font-serif text-[#845326] mb-3 text-xs sm:text-sm">
                    Por cuanto se hace constar oficialmente que el/la estudiante
                  </p>

                  {/* Nombre */}
                  <div className="w-full max-w-2xl border-b border-[#E8DCD1] pb-2 mb-6">
                    <p className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2C1F14] capitalize">
                      {data.profiles.nombre_completo || 'Nombre no definido'}
                    </p>
                  </div>

                  {/* Descripción */}
                  <p className="text-[#2C1F14] text-xs sm:text-sm mb-6 max-w-2xl mx-auto leading-relaxed">
                    Ha dedicado y completado con disciplina un tiempo efectivo de foco y estudio de:
                  </p>

                  {/* Stats Pill */}
                  <div className="flex items-center gap-4 bg-[#F2EFE8] px-6 py-3 rounded-2xl border border-[#E8DCD1] mb-6">
                    <div className="flex items-center gap-2 text-[#845326] font-bold text-lg sm:text-xl border-r border-[#DCCBBD] pr-4">
                      <Clock className="size-5" />
                      <span>{data.horas_invertidas} horas</span>
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-[#845326]/70 uppercase tracking-widest pl-2">
                      {data.temas_aprobados} Tareas Realizadas
                    </div>
                  </div>

                  <p className="text-[#2C1F14] text-xs sm:text-sm mb-6 max-w-xl mx-auto">
                    Aplicadas con éxito en el desarrollo del proyecto académico: <span className="font-bold">&quot;{data.proyectos.titulo}&quot;</span>
                  </p>

                  {/* Grid de tareas */}
                  <div className="w-full max-w-3xl grid grid-cols-2 gap-3 mt-4 mb-auto">
                    {data.tareas?.slice(0, 8).map((t, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white/70 border border-[#E8DCD1] px-4 py-2.5 rounded-xl text-left shadow-sm">
                        <CheckCircle className="size-4 text-[#845326] shrink-0" />
                        <span className="text-sm text-[#2C1F14] truncate font-medium">{t.titulo}</span>
                      </div>
                    ))}
                    {(data.tareas?.length || 0) > 8 && (
                      <div className="flex items-center gap-2 px-4 py-2 col-span-2 justify-center">
                        <span className="text-sm text-[#845326] font-bold italic">+ {(data.tareas?.length || 0) - 8} tareas adicionales...</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Area */}
                  <div className="w-full flex justify-between items-end mt-12 pt-6 border-t border-[#E8DCD1]/50">
                    
                    {/* Left: Validation */}
                    <div className="flex flex-col gap-2 text-left w-1/3">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#845326]">
                        <Calendar className="size-4" />
                        <span>Fecha de Emisión: <span className="font-bold">{format(new Date(data.fecha_emision), "d 'de' MMMM, yyyy", { locale: es })}</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#845326]">
                        <ShieldCheck className="size-4" />
                        <span>Código de Validación:</span>
                      </div>
                      <div className="bg-[#F2EFE8] border border-[#E8DCD1] px-3 py-1.5 rounded-lg mt-1 inline-block">
                        <span className="font-mono text-[9px] sm:text-[10px] text-[#845326] font-bold uppercase">{data.hash_sha256.substring(0,24)}...</span>
                      </div>
                    </div>

                    {/* Center: Stamp */}
                    <div className="flex flex-col items-center justify-center opacity-80 w-1/3">
                      <div className="w-24 h-24 border-[3px] border-dashed border-[#845326] rounded-full flex flex-col items-center justify-center bg-[#FCF9F0] z-10">
                        <Award className="size-8 text-[#845326] mb-1" />
                        <span className="text-[7px] font-black tracking-widest text-[#845326] uppercase">Komorebi</span>
                        <span className="text-[6px] font-bold tracking-widest text-[#845326] uppercase">Verificado</span>
                      </div>
                    </div>

                    {/* Right: Signature */}
                    <div className="flex flex-col items-center text-center min-w-[150px] w-1/3">
                      <div className="w-full border-b border-[#2C1F14] pb-1 mb-1 relative">
                        <span className="font-serif text-[#2C1F14] italic text-lg opacity-80">Comité Académico</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#2C1F14] uppercase tracking-wider mt-1">Komorebi Study Studio</span>
                      <span className="text-[8px] text-[#845326] uppercase tracking-widest mt-0.5">Dirección de Productividad</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="w-full sticky bottom-0 bg-white rounded-t-[24px] sm:rounded-[24px] shadow-[0_-10px_30px_rgba(0,0,0,0.1)] border border-[#E8DCD1] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-20 mt-4 mx-auto max-w-[1000px]">
              {/* Left Action Area */}
              <div className="flex items-center gap-3 w-full sm:w-auto overflow-hidden">
                <ShieldCheck className="size-5 text-emerald-600 hidden sm:block shrink-0" />
                <div className="flex items-center gap-2 overflow-hidden w-full bg-[#FCF9F0] border border-[#E8DCD1] rounded-xl pl-3 pr-1 py-1">
                  <span className="text-xs text-[#845326] whitespace-nowrap">Código de verificación:</span>
                  <span className="text-xs font-mono font-bold text-[#2C1F14] truncate">{data.hash_sha256}</span>
                  <button 
                    onClick={handleCopyHash}
                    className="ml-auto flex items-center gap-1.5 shrink-0 bg-white hover:bg-[#F2EFE8] px-3 py-1.5 rounded-lg border border-[#E8DCD1] text-[11px] font-bold text-[#845326] transition-colors"
                  >
                    {copied ? <CheckCircle className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Right Action Area */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 overflow-x-auto pb-1 sm:pb-0">
                <button 
                  disabled={isPreview}
                  className={`flex items-center gap-2 px-4 py-2 border border-[#E8DCD1] rounded-xl font-bold text-xs sm:text-sm transition-colors whitespace-nowrap ${isPreview ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400' : 'bg-white hover:bg-[#F2EFE8] text-[#2C1F14]'}`}
                >
                  <Printer className="size-4 opacity-70" />
                  <span className="hidden md:inline">Imprimir</span>
                </button>
                <button 
                  onClick={handleDownloadPNG}
                  disabled={isDownloading || isPreview}
                  className={`flex items-center gap-2 px-4 py-2 border border-[#E8DCD1] rounded-xl font-bold text-xs sm:text-sm transition-colors whitespace-nowrap ${isPreview ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400' : 'bg-white hover:bg-[#F2EFE8] text-[#2C1F14]'}`}
                >
                  <ImageIcon className="size-4 opacity-70" />
                  <span className="hidden md:inline">Imagen PNG</span>
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  disabled={isDownloading || isPreview}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-sm whitespace-nowrap ${isPreview ? 'opacity-50 cursor-not-allowed bg-[#845326]/50 text-white' : 'bg-[#845326] hover:bg-[#433022] text-white'}`}
                >
                  {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  Descargar PDF Oficial
                </button>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
