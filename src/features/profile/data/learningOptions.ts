export interface ComplementaryQuestionOption {
  id: string;
  label: string;
  field: 'objetivo' | 'ritmo' | 'dificultades' | 'area_prioritaria';
  description?: string;
  isMultiple?: boolean;
  options: string[];
}

export const OBJETIVOS_OPTIONS = [
  'Aprobar una materia o examen académico',
  'Desarrollar un proyecto extenso (Tesis, Trabajo de Grado)',
  'Aprender una nueva habilidad por cuenta propia',
  'Mejorar mi perfil profesional / Actualizar portafolio',
  'Aprender por hobby o crecimiento personal',
] as const;

export const RITMOS_OPTIONS = [
  'Constante y moderado',
  'Intensivo / Inmersivo',
  'Fines de semana / Bloques concentrados',
  'Relajado y flexible',
] as const;

export const DIFICULTADES_OPTIONS = [
  'Procrastinación severa',
  'Falta de constancia',
  'Distracciones frecuentes',
  'Mala estimación del tiempo',
] as const;

export const AREAS_PRIORITARIAS_OPTIONS = [
  'Tecnología, Informática y Datos',
  'Ciencias Exactas e Ingeniería',
  'Negocios, Finanzas y Emprendimiento',
  'Idiomas y Comunicación',
  'Artes, Diseño y Humanidades',
  'Ciencias de la Salud o Biológicas',
] as const;
