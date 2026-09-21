import React from 'react';
import type { Metadata } from 'next';
import {
  LegalPageLayout,
  type LegalHighlightItem,
  type LegalSectionItem,
} from '@/components/legal/LegalPageLayout';
import {
  ShieldCheck,
  Lock,
  Database,
  UserCheck,
  BookOpen,
  Server,
  FileCheck2,
  Cookie,
  MailCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Komorebi Study Studio',
  description:
    'Conoce los principios de privacidad, protección de datos y soberanía del estudiante en Komorebi Study Studio.',
};

const PRIVACY_HIGHLIGHTS: LegalHighlightItem[] = [
  {
    icon: <BookOpen className="size-5" />,
    title: 'Soberanía del Estudiante',
    description:
      'Tus notas, proyectos, fuentes bibliográficas y resúmenes son 100% de tu autoría y propiedad.',
  },
  {
    icon: <Lock className="size-5" />,
    title: 'Seguridad Zero-Trust',
    description:
      'Aislamiento de registros con Row Level Security (RLS) y cifrado avanzado en tránsito y reposo.',
  },
  {
    icon: <Database className="size-5" />,
    title: 'Cero Fines Comerciales',
    description:
      'No vendemos datos personales, no monetizamos hábitos de estudio ni utilizamos rastreadores publicitarios.',
  },
  {
    icon: <UserCheck className="size-5" />,
    title: 'Control y Portabilidad',
    description:
      'Tienes derecho pleno a exportar tu historial académico o solicitar el borrado permanente de tu cuenta.',
  },
];

const PRIVACY_SECTIONS: LegalSectionItem[] = [
  { id: 'introduccion', number: '1', title: 'Compromiso Institucional y Enfoque Académico' },
  {
    id: 'datos-recopilados',
    number: '2',
    title: 'Datos que Recopilamos en el Entorno Universitario',
  },
  { id: 'finalidad', number: '3', title: 'Finalidad del Tratamiento de la Información' },
  {
    id: 'seguridad',
    number: '4',
    title: 'Arquitectura de Seguridad y Confianza Cero (Zero-Trust)',
  },
  {
    id: 'propiedad',
    number: '5',
    title: 'Soberanía y Propiedad Intelectual de los Contenidos de Estudio',
  },
  { id: 'almacenamiento', number: '6', title: 'Conservación y Supresión de Cuentas Estudiantiles' },
  { id: 'cookies', number: '7', title: 'Almacenamiento Local y Cookies Técnicas' },
  { id: 'derechos', number: '8', title: 'Derechos del Usuario y Canales de Atención' },
];

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      currentPage="privacy"
      badgeText="Protección de Datos Académicos"
      badgeIcon={<ShieldCheck className="size-3.5" />}
      title="Política de Privacidad y Tratamiento de Datos"
      subtitle="En Komorebi Study Studio protegemos la privacidad de estudiantes, investigadores y docentes, garantizando que el material formativo y los registros de productividad permanezcan siempre bajo tu control."
      lastUpdated="21 de septiembre de 2026"
      readingTime="6 minutos de lectura"
      highlights={PRIVACY_HIGHLIGHTS}
      sections={PRIVACY_SECTIONS}
    >
      {/* 1. Introducción */}
      <section id="introduccion" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            1
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Compromiso Institucional y Enfoque Académico
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          <strong>Komorebi Study Studio</strong> («la Plataforma», «nosotros») es una herramienta de
          productividad, investigación y aprendizaje diseñada prioritariamente para estudiantes de
          educación superior y comunidades académicas. Reconocemos que los apuntes, proyectos de
          grado, esquemas y tiempos de concentración constituyen material intelectual de alto valor
          personal y académico.
        </p>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Esta Política de Privacidad describe de manera transparente qué información procesamos,
          con qué propósitos técnicos exclusivos lo hacemos y qué salvaguardas de seguridad
          implementamos para evitar accesos no autorizados, pérdidas de información o usos
          comerciales indebidos.
        </p>
      </section>

      {/* 2. Datos que Recopilamos */}
      <section id="datos-recopilados" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            2
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Datos que Recopilamos en el Entorno Universitario
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Recopilamos únicamente los datos mínimos indispensables para el funcionamiento y
          sincronización del espacio de trabajo académico:
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-2">
              <UserCheck className="size-4 text-accent-amber" />
              Datos de Cuenta y Perfil
            </h3>
            <ul className="text-xs text-on-surface-variant space-y-1.5 list-disc list-inside">
              <li>Nombre y apellidos o seudónimo académico preferido.</li>
              <li>Dirección de correo electrónico institucional o personal.</li>
              <li>Fotografía o avatar de perfil (opcional).</li>
              <li>
                Contraseña cifrada (mediante algoritmos criptográficos robustos de un solo sentido).
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-2">
              <BookOpen className="size-4 text-accent-amber" />
              Datos Académicos y de Estudio
            </h3>
            <ul className="text-xs text-on-surface-variant space-y-1.5 list-disc list-inside">
              <li>Estructura de proyectos, temas de estudio y entregas académicas.</li>
              <li>Apuntes, fuentes bibliográficas, enlaces y notas asociadas.</li>
              <li>Sesiones del temporizador de estudio (método Pomodoro).</li>
              <li>Métricas de constancia: rachas de estudio y horas dedicadas.</li>
            </ul>
          </div>
        </div>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-4 text-xs text-on-surface-variant">
          <p>
            <strong>Nota de seguridad de red:</strong> No recopilamos información crediticia,
            números de seguridad social, datos biométricos ni información sensible que no guarde
            relación directa con la organización de los estudios universitarios.
          </p>
        </div>
      </section>

      {/* 3. Finalidad del Tratamiento */}
      <section id="finalidad" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            3
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Finalidad del Tratamiento de la Información
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          El tratamiento de tus datos responde estrictamente a necesidades operativas de la
          plataforma:
        </p>
        <ul className="space-y-2.5 text-sm sm:text-base text-on-surface-variant">
          <li className="flex items-start gap-2.5">
            <span className="text-accent-amber font-bold shrink-0">✓</span>
            <span>
              <strong>Prestación del servicio de gestión:</strong> Sincronizar tus materias, notas y
              sesiones entre dispositivos en tiempo real.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-accent-amber font-bold shrink-0">✓</span>
            <span>
              <strong>Cálculo de analíticas formativas:</strong> Permitirte visualizar tu evolución
              semanal de estudio, horas dedicadas y cumplimiento de objetivos.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-accent-amber font-bold shrink-0">✓</span>
            <span>
              <strong>Autenticación y seguridad:</strong> Verificar tu identidad, permitir la
              recuperación de contraseñas y prevenir accesos no autorizados.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="text-accent-amber font-bold shrink-0">✓</span>
            <span>
              <strong>Notificaciones académicas:</strong> Enviarte recordatorios de estudio o
              alertas de cuenta configuradas voluntariamente por el usuario.
            </span>
          </li>
        </ul>
      </section>

      {/* 4. Arquitectura de Seguridad */}
      <section id="seguridad" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            4
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Arquitectura de Seguridad y Confianza Cero (Zero-Trust)
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          La infraestructura de Komorebi Study Studio opera bajo directrices rigurosas de seguridad
          informática y el principio de mínimo privilegio:
        </p>
        <div className="space-y-3 pt-1">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 flex items-start gap-3.5">
            <Lock className="size-5 text-accent-amber shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-primary">
                Cifrado de Extremo a Extremo en Tránsito y Reposo
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Todas las comunicaciones entre tu navegador y nuestros servidores viajan cifradas
                con TLS 1.3 mediante HTTPS. Los almacenes de datos en la nube aplican cifrado
                estándar AES-256 en reposo.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 flex items-start gap-3.5">
            <Server className="size-5 text-accent-amber shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-primary">
                Seguridad a Nivel de Fila (Row Level Security - RLS)
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                La base de datos ejecuta políticas de aislamiento estricto en el motor PostgreSQL:
                cada consulta requiere verificación criptográfica del token de sesión del
                estudiante. Es técnicamente imposible que un usuario consulte o modifique los
                registros de otro.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 flex items-start gap-3.5">
            <ShieldCheck className="size-5 text-accent-amber shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-primary">
                Protección contra Vulnerabilidades Web
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                Implementamos sanitización de entradas, esquemas validados con tipado estricto en el
                servidor y cabeceras HTTP de seguridad (CSP, HSTS, X-Frame-Options) para mitigar
                vectores de inyección y ataques de falsificación (CSRF).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Soberanía y Propiedad Intelectual */}
      <section id="propiedad" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            5
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Soberanía y Propiedad Intelectual de los Contenidos de Estudio
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Establecemos una regla inequívoca:{' '}
          <strong>
            tú eres el único titular de los derechos de autor de cualquier contenido académico que
            registres en la plataforma
          </strong>
          .
        </p>
        <div className="rounded-2xl border-l-4 border-accent-amber bg-surface-container-low p-5">
          <p className="text-xs sm:text-sm font-medium text-on-surface leading-relaxed">
            Komorebi Study Studio no adquiere derechos de propiedad sobre tus tesis, artículos,
            resúmenes, esquemas ni apuntes de clase. No empleamos los textos de tus materias para
            entrenar modelos públicos de inteligencia artificial sin tu consentimiento explícito y
            separado.
          </p>
        </div>
      </section>

      {/* 6. Conservación y Supresión de Cuentas */}
      <section id="almacenamiento" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            6
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Conservación y Supresión de Cuentas Estudiantiles
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Mantenemos tu información activa mientras continúes utilizando la plataforma durante tus
          periodos lectivos.
        </p>
        <ul className="space-y-2 text-sm sm:text-base text-on-surface-variant list-disc list-inside">
          <li>
            <strong>Inactividad prolongada:</strong> Tras un periodo continuo de 24 meses sin
            acceso, recibirás una notificación de aviso antes de proceder a la hibernación de
            registros.
          </li>
          <li>
            <strong>Eliminación voluntaria:</strong> Puedes solicitar en cualquier momento la
            eliminación total de tu perfil y de todos los proyectos vinculados. Dicha acción es
            irreversible y elimina los datos de nuestros almacenes activos en un plazo no superior a
            30 días.
          </li>
        </ul>
      </section>

      {/* 7. Cookies Técnicas y Almacenamiento Local */}
      <section id="cookies" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            7
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Almacenamiento Local y Cookies Técnicas
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          No utilizamos cookies de seguimiento entre sitios, ni redes de terceros para rastrear tu
          navegación en la web. Únicamente utilizamos:
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
            <h3 className="text-xs font-bold text-primary flex items-center gap-2 mb-1.5">
              <Cookie className="size-4 text-accent-amber" />
              Cookies de Sesión Segura (HTTP-Only)
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Necesarias para validar la identidad del usuario activo y proteger las solicitudes
              contra ataques cross-site (SameSite=Lax).
            </p>
          </div>
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
            <h3 className="text-xs font-bold text-primary flex items-center gap-2 mb-1.5">
              <FileCheck2 className="size-4 text-accent-amber" />
              Almacenamiento Local (Local Storage)
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Almacena preferencias del entorno de estudio (como el estado de temporizadores de foco
              y filtros visuales) para garantizar fluidez sin depender de la red.
            </p>
          </div>
        </div>
      </section>

      {/* 8. Derechos del Usuario y Contacto */}
      <section id="derechos" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 pb-3">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-on-primary">
            8
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
            Derechos del Usuario y Canales de Atención
          </h2>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
          Como usuario de la plataforma universitaria, te asisten en todo momento los derechos de
          acceso, rectificación, portabilidad y supresión de tus datos personales (derechos ARCO /
          normativas internacionales de protección de datos).
        </p>
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5 space-y-3">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <MailCheck className="size-4 text-accent-amber" />
            Contacto de Protección de Datos
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Para ejercer tus derechos de privacidad, solicitar la exportación de tus registros
            académicos en formato abierto (JSON/CSV) o plantear inquietudes técnicas, puedes
            escribir a:
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="mailto:privacidad@komorebi.studio"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-on-primary hover:bg-primary/90 transition-colors"
            >
              <span>privacidad@komorebi.studio</span>
            </a>
            <span className="text-xs text-on-surface-variant">
              Tiempo estimado de respuesta: menor a 48 horas hábiles.
            </span>
          </div>
        </div>
      </section>
    </LegalPageLayout>
  );
}
