export type MessageIntent = 'informational' | 'update_project' | 'create_project';

export interface DetectedIntent {
  intent: MessageIntent;
  targetProject?: {
    id: string;
    titulo: string;
  };
}

/**
 * Palabras clave y expresiones que denotan intención de crear un nuevo plan, proyecto o conjunto de tareas.
 */
const CREATE_PROJECT_TRIGGERS = [
  'crear proyecto',
  'crear un proyecto',
  'crear nuevo proyecto',
  'crea un proyecto',
  'crea proyecto',
  'nuevo proyecto',
  'iniciar proyecto',
  'plan de estudio',
  'plan de aprendizaje',
  'roadmap',
  'hoja de ruta',
  'cronograma',
  'planifica',
  'planificar',
  'diseña un plan',
  'organiza un plan',
  'generar tareas',
  'genera tareas',
  'dame tareas para aprender',
  'dame un plan',
  'rutina de estudio',
  'pasos para aprender',
  'fases para aprender',
];

/**
 * Palabras clave que denotan intención de actualizar o agregar tareas a un proyecto existente.
 */
const UPDATE_PROJECT_TRIGGERS = [
  'actualizar proyecto',
  'actualiza el proyecto',
  'actualiza mi proyecto',
  'actualizar tareas',
  'actualiza las tareas',
  'agregar tareas',
  'agrega tareas',
  'agrega 2 tareas',
  'agrega estas tareas',
  'añadir tareas',
  'añade tareas',
  'incorporar tareas',
  'sumar tareas',
  'nuevas tareas para',
  'más tareas para',
  'siguientes tareas',
  'continuar con el proyecto',
  'avanzar en el proyecto',
];

/**
 * Palabras clave típicas de consultas informativas, teóricas o de explicación general.
 */
const INFORMATIONAL_TRIGGERS = [
  'qué es',
  'que es',
  'quién es',
  'quien es',
  'cómo funciona',
  'como funciona',
  'por qué',
  'por que',
  'para qué sirve',
  'para que sirve',
  'explícame',
  'explicame',
  'explica',
  'diferencia entre',
  'diferencias entre',
  'cuál es la diferencia',
  'resumen de',
  'resúmeme',
  'resumeme',
  'significado de',
  'concepto de',
  'definición de',
  'definicion de',
];

/**
 * Analiza el mensaje del usuario y los proyectos existentes para determinar la intención.
 */
export function detectMessageIntent(
  userMessage: string,
  userProjects: Array<{ id: string; titulo: string }> = [],
): DetectedIntent {
  const normalized = userMessage.toLowerCase().trim();

  // 1. Verificar si menciona explícitamente el nombre de alguno de los proyectos del usuario
  let matchedProject: { id: string; titulo: string } | undefined = undefined;
  for (const proj of userProjects) {
    const projTitleNorm = proj.titulo.toLowerCase().trim();
    if (projTitleNorm.length > 2 && normalized.includes(projTitleNorm)) {
      matchedProject = proj;
      break;
    }
  }

  // 2. Si pide crear explícitamente un proyecto o plan nuevo (tiene precedencia sobre actualización genérica)
  const hasExplicitCreate =
    CREATE_PROJECT_TRIGGERS.some((tr) => normalized.includes(tr)) ||
    ((normalized.includes('crear') || normalized.includes('crea') || normalized.includes('nuevo')) &&
      (normalized.includes('proyecto') || normalized.includes('plan')));

  if (hasExplicitCreate && !matchedProject) {
    return {
      intent: 'create_project',
    };
  }

  // 3. Si menciona un proyecto existente o pide expresamente actualizar/agregar tareas a un proyecto
  const hasUpdateTrigger =
    UPDATE_PROJECT_TRIGGERS.some((tr) => normalized.includes(tr)) ||
    ((normalized.includes('actualiz') ||
      normalized.includes('agreg') ||
      normalized.includes('añad') ||
      normalized.includes('sumar') ||
      normalized.includes('incorpor')) &&
      (normalized.includes('tarea') || normalized.includes('proyecto')));

  if (hasUpdateTrigger || (matchedProject && (normalized.includes('tarea') || normalized.includes('actualiz') || normalized.includes('agreg') || normalized.includes('añad')))) {
    return {
      intent: 'update_project',
      targetProject: matchedProject || userProjects[0],
    };
  }

  // 4. Si pide crear y además coincidió con un proyecto existente (e.g. "Crea un plan para continuar mi proyecto Rutina fitness")
  if (hasExplicitCreate) {
    return {
      intent: 'update_project',
      targetProject: matchedProject || userProjects[0],
    };
  }

  // 5. Verificar si es una consulta meramente informativa
  const hasInformationalTrigger = INFORMATIONAL_TRIGGERS.some((tr) => normalized.includes(tr));
  if (hasInformationalTrigger && !normalized.includes('proyecto') && !normalized.includes('plan')) {
    return {
      intent: 'informational',
    };
  }

  // 6. Caso por defecto: Si no pidió proyectos ni tareas explícitamente, tratar como informativo
  const mentionsProjectOrPlan =
    normalized.includes('proyecto') ||
    normalized.includes('plan') ||
    normalized.includes('tarea') ||
    normalized.includes('roadmap') ||
    normalized.includes('cronograma');

  if (!mentionsProjectOrPlan) {
    return {
      intent: 'informational',
    };
  }

  return {
    intent: userProjects.length > 0 ? 'update_project' : 'create_project',
    targetProject: userProjects[0],
  };
}
