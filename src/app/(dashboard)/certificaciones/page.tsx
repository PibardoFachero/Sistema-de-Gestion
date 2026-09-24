import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Award, Calendar, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata: Metadata = {
  title: 'Mis Certificaciones | Komorebi',
  description: 'Galería de certificados emitidos por tu inversión de tiempo y logros académicos.',
};

interface CertificadoItem {
  id: string;
  hash_sha256: string;
  fecha_emision: string;
  horas_invertidas: number;
  temas_aprobados: number;
  project_id: string;
  proyectos?: {
    titulo: string;
  } | null;
}

export default async function CertificacionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch certificates along with project details
  const { data: certs } = await supabase
    .from('certificados_emitidos')
    .select(
      `
      id,
      hash_sha256,
      fecha_emision,
      horas_invertidas,
      temas_aprobados,
      project_id,
      proyectos (
        titulo
      )
    `,
    )
    .eq('profile_id', user.id)
    .order('fecha_emision', { ascending: false });

  const certificados = (certs || []) as unknown as CertificadoItem[];

  return (
    <div className="flex flex-col min-h-full pb-20 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <header className="mb-8 flex items-center gap-4">
        <Link
          href="/perfil"
          className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"
          title="Volver al Perfil"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2C1F14] flex items-center gap-2">
            <Award className="size-8 text-primary" />
            Mis Certificaciones
          </h1>
          <p className="text-on-surface-variant">
            Galería de tus logros validados criptográficamente en Komorebi.
          </p>
        </div>
      </header>

      {certificados.length === 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-3xl p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Award className="size-8 text-primary/60" />
          </div>
          <h2 className="text-xl font-bold text-on-surface mb-2">Aún no tienes certificaciones</h2>
          <p className="text-on-surface-variant max-w-md mx-auto mb-6">
            Completa todas las tareas de un proyecto al 100% y aprueba el cuestionario de evaluación
            para obtener tu primer certificado de inversión de tiempo.
          </p>
          <Link
            href="/proyectos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm hover:shadow"
          >
            Ir a mis proyectos
          </Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {certificados.map((cert) => (
          <div
            key={cert.id}
            className="relative group bg-white border border-[#EAE3DC] rounded-[24px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300"
          >
            {/* Cabecera visual del certificado */}
            <div className="h-[120px] bg-[linear-gradient(135deg,#D8C4E0_0%,#E8B4B8_100%)] p-6 relative flex flex-col justify-end">
              <div className="absolute top-4 right-4 bg-white/30 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#845326] flex items-center gap-1.5">
                <CheckCircle className="size-3.5" />
                Certificado Verificado
              </div>
              <h3 className="text-2xl font-black text-[#2C1F14] leading-tight line-clamp-1 drop-shadow-sm">
                {cert.proyectos?.titulo || 'Proyecto Eliminado'}
              </h3>
            </div>

            {/* Cuerpo del certificado */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider flex items-center gap-1">
                    <Clock className="size-3" /> Horas Invertidas
                  </span>
                  <span className="text-lg font-bold text-on-surface">
                    {cert.horas_invertidas} horas
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle className="size-3" /> Tareas Aprobadas
                  </span>
                  <span className="text-lg font-bold text-on-surface">
                    {cert.temas_aprobados} temas
                  </span>
                </div>
                <div className="col-span-2 flex flex-col gap-1 mt-2">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="size-3" /> Fecha de Emisión
                  </span>
                  <span className="text-sm font-semibold text-on-surface-variant">
                    {format(new Date(cert.fecha_emision), "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl p-3 mb-6 border border-outline-variant/50 font-mono text-[10px] text-outline break-all">
                Hash: {cert.hash_sha256}
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/proyectos/${cert.project_id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors text-sm"
                >
                  <Award className="size-4" /> Ver Detalles
                </Link>
                {/* Nota: La descarga y visualización del PDF se maneja preferiblemente desde el Proyecto para reutilizar el modal,
                    pero aquí podríamos mostrar botones si estuviera abstraído */}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
