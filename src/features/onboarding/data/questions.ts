export interface OnboardingQuestion {
  id: number;
  question: string;
  chiwiSpeech: string;
  options: string[];
}

export const onboardingQuestions: OnboardingQuestion[] = [
  {
    id: 1,
    question: '¿Cuál es tu rol o condición actual?',
    chiwiSpeech: 'yo soy un chiwire autodidacta',
    options: [
      'Estudiante de bachillerato',
      'Estudiante universitario',
      'Autodidacta',
      'Profesional independiente',
    ],
  },
  {
    id: 2,
    question: '¿Cuál es tu edad?',
    chiwiSpeech: 'yo tengo 5 años de chiwire',
    options: ['Menos de 18', 'Entre 18 y 25 años', '26 años o más'],
  },
  {
    id: 3,
    question: '¿Cuál es tu situación laboral u ocupación actual?',
    chiwiSpeech: 'Mi trabajo es ser tu tutor ¡Me Chiwiencanta!',
    options: ['Solo estudio', 'Solo trabajo', 'Estudio y trabajo', 'Ninguna de las anteriores'],
  },
  {
    id: 4,
    question: '¿Qué tipo de esquema de horarios tienes en tu ocupación principal?',
    chiwiSpeech: 'Yo siempre estare disponible en tu horario, porque soy tu chiwire de confianza',
    options: [
      'Jornada completa',
      'Media jornada',
      'Jornada nocturna',
      'Horario rotativo, flexible o impredecible',
    ],
  },
  {
    id: 5,
    question: '¿Cuánto tiempo diario tienes disponible para dedicar a tus proyectos de estudio?',
    chiwiSpeech: 'Chiwitastico, espero que pasemos mucho tiempo juntos',
    options: [
      'Entre 30 a 60 minutos al día',
      'Entre 1 a 2 horas al día',
      'Entre 2 a 4 horas al día',
      'Más de 4 horas al día',
    ],
  },
  {
    id: 6,
    question: '¿Qué técnica o metodología de aprendizaje prefieres utilizar inicialmente?',
    chiwiSpeech:
      'Tu no te preocupes este chiwire te enseñara a cumplir tus metas con tecnicas reales de estudio, sino mirame a mi que soy tutor',
    options: [
      'Técnica Pomodoro',
      'Bloques de Tiempo',
      'Técnica Feynman',
      'No tengo experiencia previa con estas técnicas',
    ],
  },
  {
    id: 7,
    question: '¿Cuál es tu nivel de experiencia previa estructurando planes de estudio?',
    chiwiSpeech: 'Chiwires somos tu y yo. A darle a esos proyectos. Animo!!',
    options: [
      'Básico (Me cuesta organizarme y suelo procrastinar)',
      'Intermedio (Uso listas de tareas, pero no siempre las cumplo)',
      'Avanzado (Tengo buena disciplina, pero busco optimizar mi rendimiento)',
    ],
  },
];
