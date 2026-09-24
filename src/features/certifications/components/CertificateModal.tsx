'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Download, Share2, Award, CheckCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CertificateModalProps {
  hash: string;
  isOpen: boolean;
  onClose: () => void;
}

interface CertData {
  hash_sha256: string;
  fecha_emision: string;
  horas_invertidas: number;
  temas_aprobados: number;
  proyectos: { titulo: string };
  profiles: { nombre_completo: string };
}

export function CertificateModal({ hash, isOpen, onClose }: CertificateModalProps) {
  const supabase = createClient();
  const certRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && hash) {
      setLoading(true);
      supabase
        .from('certificados_emitidos')
        .select(`
          hash_sha256,
          fecha_emision,
          horas_invertidas,
          temas_aprobados,
          proyectos ( titulo ),
          profiles ( nombre_completo )
        `)
        .eq('hash_sha256', hash)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setData(data as any);
          }
          setLoading(false);
        });
    }
  }, [isOpen, hash, supabase]);

  const handleDownload = async () => {
    if (!certRef.current || isDownloading || !data) return;
    try {
      setIsDownloading(true);
      // Importamos dinámicamente para no romper SSR
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(certRef.current, {
        scale: 2, // Mejor calidad
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificado_Komorebi_${data.proyectos.titulo.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error downloading PDF', error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    // Podríamos copiar un link al perfil público, o un link de verificación
    const text = `He obtenido una certificación en "${data?.proyectos.titulo}" tras invertir ${data?.horas_invertidas} horas de estudio autodidacta en Komorebi. \n\nValidación Hash: ${data?.hash_sha256}`;
    if (navigator.share) {
      navigator.share({
        title: 'Certificación Komorebi',
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert('Texto de validación copiado al portapapeles. ¡Pégalo en tu LinkedIn!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl max-h-full flex flex-col bg-surface rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Actions */}
        <div className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-2 font-bold text-[#2C1F14]">
            <Award className="size-5 text-primary" />
            Tu Certificado
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={loading || isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>
            <button
              onClick={handleShare}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-xl font-bold text-on-surface hover:bg-surface-container transition-colors text-sm disabled:opacity-50"
            >
              <Share2 className="size-4" />
            </button>
            <button onClick={onClose} className="p-2 ml-2 rounded-full hover:bg-surface-container transition-colors text-outline">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-surface-container-lowest flex items-center justify-center">
          {loading || !data ? (
            <div className="flex flex-col items-center justify-center py-20 text-outline">
              <Loader2 className="size-8 animate-spin mb-4" />
              <p>Cargando certificado criptográfico...</p>
            </div>
          ) : (
            // A4 Landscape Aspect Ratio Container for the Certificate (297 x 210 mm -> approx 1.414 ratio)
            <div className="w-full max-w-[900px] aspect-[1.414/1] relative shadow-lg rounded-sm overflow-hidden bg-white shrink-0">
              
              {/* Contenedor exacto que será capturado por html2canvas */}
              <div 
                ref={certRef}
                className="absolute inset-0 bg-white flex flex-col text-[#2C1F14] relative p-12 sm:p-16 border-[12px] border-[#FAF8F5]"
                style={{
                  backgroundImage: 'radial-gradient(#E8DCD1 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 10px 10px'
                }}
              >
                {/* Background Decorators */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[linear-gradient(135deg,#D8C4E0_0%,#E8B4B8_100%)] rounded-bl-[100%] opacity-20" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[linear-gradient(135deg,#BBD0F4_0%,#C8D6AF_100%)] rounded-tr-[100%] opacity-20" />

                {/* Header */}
                <div className="relative z-10 flex justify-between items-start mb-12">
                  <div className="flex items-center gap-3">
                    <img src="/images/mascot/chigui-focus.png" alt="Komorebi Logo" className="w-12 h-12 object-contain grayscale opacity-80" />
                    <div>
                      <h1 className="text-xl font-black tracking-widest text-[#2C1F14] uppercase">Komorebi</h1>
                      <p className="text-[10px] font-bold text-outline tracking-widest uppercase">Plataforma de Estudio Autodidacta</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-outline uppercase tracking-wider mb-1">Fecha de Emisión</p>
                    <p className="text-sm font-bold text-[#2C1F14]">
                      {format(new Date(data.fecha_emision), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center mt-[-2rem]">
                  <p className="text-sm font-bold text-[#845326] uppercase tracking-[0.3em] mb-4">
                    Certificado de Inversión de Tiempo
                  </p>
                  <h2 className="text-[10px] sm:text-xs font-bold text-outline uppercase tracking-widest mb-4">
                    Otorgado satisfactoriamente a
                  </h2>
                  <h3 className="text-4xl sm:text-5xl font-black text-[#2C1F14] mb-8 capitalize italic font-serif">
                    {data.profiles.nombre_completo}
                  </h3>
                  
                  <div className="max-w-xl mx-auto text-sm sm:text-base text-on-surface-variant leading-relaxed">
                    Por haber culminado con éxito el proyecto de estudio independiente titulado 
                    <strong className="text-[#2C1F14]"> &quot;{data.proyectos.titulo}&quot;</strong>, 
                    demostrando disciplina y constancia mediante la superación de 
                    <strong className="text-[#2C1F14]"> {data.temas_aprobados} temas</strong> de conocimiento 
                    y validando una inversión temporal de 
                    <strong className="text-[#2C1F14]"> {data.horas_invertidas} horas</strong>.
                  </div>
                </div>

                {/* Footer / Signatures / Hash */}
                <div className="relative z-10 flex justify-between items-end mt-auto pt-8 border-t border-outline-variant/30">
                  <div className="flex flex-col gap-1 max-w-[50%]">
                    <p className="text-[9px] font-bold text-outline uppercase tracking-widest">Código de Verificación Criptográfica (SHA-256)</p>
                    <p className="text-[10px] font-mono text-[#845326] break-all">{data.hash_sha256}</p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-40 border-b border-[#2C1F14] mb-2" />
                    <p className="text-xs font-bold text-[#2C1F14] uppercase tracking-widest">Validación de Sistema</p>
                    <p className="text-[10px] text-outline">Komorebi AI Engine</p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
