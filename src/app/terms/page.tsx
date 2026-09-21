import React from 'react';
import type { Metadata } from 'next';
import {
  LegalPageLayout,
  type LegalHighlightItem,
  type LegalSectionItem,
} from '@/components/legal/LegalPageLayout';
import {
  FileText,
  Scale,
  GraduationCap,
  ShieldAlert,
  Award,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos de Servicio | Komorebi Study Studio',
  description:
    'Estatutos de uso, directrices de integridad académica y condiciones del servicio para Komorebi Study Studio.',
};

const TERMS_HIGHLIGHTS: LegalHighlightItem[] = [
  {
    icon: <GraduationCap className="size-5" />,
    title: 'Propósito Formativo',
    description:
      'Plataforma diseñada para apoyar la productividad, el estudio sistemático y la investigación universitaria.',
  },
  {
    icon: <Award className="size-5" />,
    title: 'Integridad y Ética',
    description:
      'Exigimos respeto estricto al código de honor académico, prohibiendo el plagio y la suplantación de identidad.',
  },
  {
    icon: <Scale className="size-5" />,
    title: 'Tus Contenidos son Tuyos',
    description:
      'Mantienes todos los derechos morales y patrimoniales sobre los apuntes, proyectos y notas que elabores.',
  },
  {
    icon: <CheckCircle2 className="size-5" />,
    title: 'Transparencia Total',
    description:
      'Sin costos ocultos, sin venta de tus rutinas y con reglas claras de convivencia y almacenamiento seguro.',
  },
];

const TERMS_SECTIONS: LegalSectionItem[] = [
  { id: 'aceptacion', number: '1', title: 'Aceptación de los Términos y Objeto del Servicio' },
  { id: 'cuentas', number: '2', title: 'Registro, Cuentas Universitarias y Seguridad de Acceso' },
  {
    id: 'codigo-honor',
    number: '3',
    title: 'Código de Honor, Integridad Académica y Prohibiciones',
  },
  { id: 'propiedad', number: '4', title: 'Propiedad Intelectual y Derechos sobre los Contenidos' },
  {
    id: 'disponibilidad',
    number: '5',
    title: 'Disponibilidad del Servicio, Mantenimiento y Cambios',
  },
  {
    id: 'responsabilidad',
    number: '6',
    title: 'Limitación de Responsabilidad e Idoneidad Académica',
  },
  { id: 'terminacion', number: '7', title: 'Suspensión, Cancelación y Cierre de Cuentas' },
  { id: 'contacto', number: '8', title: 'Modificaciones de los Términos y Soporte Institucional' },
];

export default function TermsPage() {
  return (
    <LegalPageLayout
      currentPage="terms"
      badgeText="Términos Legales y Académicos"
      badgeIcon={<FileText className="size-3.5" />}
      title="Términos y Condiciones de Uso del Servicio"
      subtitle="Reglas claras, derechos y compromisos compartidos para una convivencia académica íntegra, productiva y respetuosa en Komorebi Study Studio."
      lastUpdated="21 de septiembre de 2026"
      readingTime="7 minutos de lectura"
      highlights={TERMS_HIGHLIGHTS}
      sections={TERMS_SECTIONS}
    >
      {/* 1. Aceptación */}
      <section id="aceptacion" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            1
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Aceptación de los Términos y Objeto del Servicio
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Al acceder, registrarte o utilizar <strong>Komorebi Study Studio</strong> («el Servicio»,
          «la Plataforma»), aceptas vincularte jurídicamente a los presentes Términos y Condiciones
          de Uso. Si no estás de acuerdo con alguna de las cláusulas aquí expuestas, deberás
          abstenerte de utilizar la plataforma.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Komorebi Study Studio tiene por misión proporcionar una suite de herramientas digitales
          para optimizar los métodos de estudio, el seguimiento de proyectos académicos, la
          bibliografía y la gestión del tiempo personal mediante temporizadores de concentración y
          analíticas formativas.
        </p>
      </section>

      {/* 2. Cuentas y Seguridad */}
      <section id="cuentas" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            2
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Registro, Cuentas Universitarias y Seguridad de Acceso
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Para acceder a las funciones avanzadas de sincronización de asignaturas y proyectos, es
          necesario crear una cuenta de usuario. Al hacerlo, te comprometes a:
        </p>
        <ul className="space-y-2 text-sm sm:text-base text-on-surface-variant list-disc list-inside">
          <li>
            <strong>Veracidad:</strong> Proporcionar información fidedigna y mantener actualizada tu
            dirección de correo electrónico institucional o personal.
          </li>
          <li>
            <strong>Custodia de credenciales:</strong> Eres el único responsable de salvaguardar la
            confidencialidad de tu contraseña y de cualquier actividad originada desde tu sesión.
          </li>
          <li>
            <strong>Carácter intransferible:</strong> Las cuentas son para uso estrictamente
            individual. No está permitida la compartición de accesos entre múltiples personas para
            falsear registros o métricas.
          </li>
          <li>
            <strong>Notificación oportuna:</strong> Deberás reportar de inmediato a nuestro equipo
            cualquier vulneración o indicio de acceso no autorizado a tu perfil.
          </li>
        </ul>
      </section>

      {/* 3. Código de Honor e Integridad */}
      <section id="codigo-honor" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            3
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Código de Honor, Integridad Académica y Prohibiciones
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Komorebi Study Studio promueve valores éticos fundamentales para la comunidad de educación
          superior. Al utilizar el sistema, asumes los siguientes compromisos:
        </p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 pt-1">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
            <h3 className="text-xs font-bold text-primary flex items-center gap-2 mb-1.5">
              <Award className="size-4 text-accent-amber" />
              Integridad en la Investigación
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Citar apropiadamente las fuentes académicas registradas en los módulos de
              investigación y no atribuirse la autoría de trabajos de terceros.
            </p>
          </div>
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
            <h3 className="text-xs font-bold text-primary flex items-center gap-2 mb-1.5">
              <ShieldAlert className="size-4 text-status-urgent" />
              Seguridad del Sistema
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Queda estrictamente prohibido intentar eludir los controles de autenticación (RLS),
              realizar inyecciones de código o sobrecargar los servidores deliberadamente.
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-status-attention/30 bg-status-attention-bg p-4 text-xs text-on-surface-variant">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="size-4 text-status-attention shrink-0 mt-0.5" />
            <div>
              <strong className="text-status-attention">Conductas no permitidas:</strong> No se
              tolerará la carga de material ilegal, difamatorio, que viole secretos profesionales,
              virus informáticos o contenido que infrinja derechos de autor de editoriales
              universitarias.
            </div>
          </div>
        </div>
      </section>

      {/* 4. Propiedad Intelectual */}
      <section id="propiedad" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            4
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Propiedad Intelectual y Derechos sobre los Contenidos
          </h2>
        </div>
        <div className="space-y-3">
          <h3 className="text-base font-bold text-primary">Tus Contenidos</h3>
          <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
            Conservas todos los derechos morales y de propiedad intelectual sobre los proyectos,
            apuntes, archivos y resúmenes que crees o importes en la Plataforma. Al subirlos, nos
            otorgas únicamente una licencia limitada, revocable y no exclusiva para almacenar,
            procesar y mostrar dichos contenidos en tu cuenta según lo requiera el servicio técnico.
          </p>
          <h3 className="text-base font-bold text-primary pt-2">Elementos de la Plataforma</h3>
          <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
            El código fuente, la arquitectura de software, las interfaces visuales, la mascota
            institucional («Chigüi»), logotipos y marcas de Komorebi Study Studio son propiedad
            exclusiva de sus desarrolladores y están amparados por las leyes de propiedad industrial
            y derechos de autor aplicables.
          </p>
        </div>
      </section>

      {/* 5. Disponibilidad y Mantenimiento */}
      <section id="disponibilidad" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            5
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Disponibilidad del Servicio, Mantenimiento y Cambios
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Nos esforzamos por mantener una alta disponibilidad del sistema durante todo el calendario
          lectivo universitario. Sin embargo:
        </p>
        <ul className="space-y-2 text-sm sm:text-base text-on-surface-variant list-disc list-inside">
          <li>
            <strong>Ventanas de mantenimiento:</strong> Podrán realizarse actualizaciones de
            seguridad o mejoras de rendimiento, procurando programarlas fuera de los horarios pico
            de estudio.
          </li>
          <li>
            <strong>Evolución funcional:</strong> Nos reservamos el derecho de modificar, actualizar
            o discontinuar características no críticas del sistema con el propósito de refinar la
            experiencia pedagógica.
          </li>
        </ul>
      </section>

      {/* 6. Limitación de Responsabilidad */}
      <section id="responsabilidad" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            6
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Limitación de Responsabilidad e Idoneidad Académica
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Komorebi Study Studio se provee «tal como está» («as is») y «según disponibilidad». En la
          medida permitida por la ley:
        </p>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 space-y-2 text-xs sm:text-sm text-on-surface-variant">
          <p>
            • <strong>No sustitución académica:</strong> La plataforma constituye una herramienta de
            asistencia organizacional y estudio personal; no sustituye los canales oficiales,
            secretarías virtuales ni plataformas de evaluación formal de tu universidad o facultad.
          </p>
          <p>
            • <strong>Copias de respaldo:</strong> Aunque aplicamos redundancia en bases de datos y
            almacenamiento en la nube, recomendamos a los usuarios mantener copias de seguridad de
            sus tesis o documentos críticos para su titulación.
          </p>
        </div>
      </section>

      {/* 7. Terminación y Clausura de Cuentas */}
      <section id="terminacion" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            7
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Suspensión, Cancelación y Cierre de Cuentas
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Cualquier estudiante puede dar de baja su cuenta en cualquier momento a través del panel
          de configuración de perfil o mediante solicitud directa a soporte.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Nos reservamos el derecho de suspender temporalmente o cancelar de manera definitiva el
          acceso a usuarios que cometan infracciones graves a este Código de Honor, intenten
          vulnerar la seguridad informática de la plataforma o incurran en hostigamiento hacia otros
          miembros de la comunidad académica.
        </p>
      </section>

      {/* 8. Modificaciones y Contacto */}
      <section id="contacto" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            8
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Modificaciones de los Términos y Soporte Institucional
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Podemos actualizar estos Términos periódicamente para reflejar mejoras operativas o
          adecuaciones normativas. Cuando los cambios sean significativos, notificaremos a los
          usuarios mediante un banner visible en el panel de inicio o vía correo electrónico antes
          de su entrada en vigor.
        </p>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 space-y-3">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <HelpCircle className="size-4 text-accent-amber" />
            Canales de Orientación y Consulta
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Si representas a una institución educativa, centro de estudiantes o requieres
            aclaratorias sobre estos términos de servicio, puedes dirigirte a:
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="mailto:terminos@komorebi.studio"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-on-primary hover:bg-primary/90 transition-colors"
            >
              <span>terminos@komorebi.studio</span>
            </a>
            <span className="text-xs text-on-surface-variant">
              Atención orientada a la comunidad universitaria.
            </span>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
