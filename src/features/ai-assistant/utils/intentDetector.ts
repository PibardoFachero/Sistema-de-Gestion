export type MessageIntent =
  | 'informational'
  | 'update_project'
  | 'create_project'
  | 'recommend_topics'
  | 'confirm_recommendation';

export interface DetectedIntent {
  intent: MessageIntent;
  targetProject?: {
    id: string;
    titulo: string;
  };
  suggestedTopic?: {
    titulo: string;
    objetivo: string;
  };
}

/**
 * Expresiones que denotan que el usuario está pidiendo recomendaciones o ideas de temas para proyectos.
 */
const TOPIC_RECOMMENDATION_TRIGGERS = [
  'recomiéndame temas',
  'recomiendame temas',
  'recomiéndame un tema',
  'recomiendame un tema',
  'recomiéndame proyectos',
  'recomiendame proyectos',
  'recomiéndame un proyecto',
  'recomiendame un proyecto',
  'recomendaciones de temas',
  'recomendacion de temas',
  'recomendación de temas',
  'recomendación de proyectos',
  'recomendacion de proyectos',
  'recomendaciones de proyectos',
  'qué temas me recomiendas',
  'que temas me recomiendas',
  'qué proyecto me recomiendas',
  'que proyecto me recomiendas',
  'qué proyectos me recomiendas',
  'que proyectos me recomiendas',
  'ideas de proyectos',
  'ideas para proyectos',
  'ideas de proyecto',
  'ideas para proyecto',
  'sugiere proyectos',
  'sugiéreme proyectos',
  'sugiereme proyectos',
  'sugiere temas',
  'sugiéreme temas',
  'sugiereme temas',
  'temas para proyecto',
  'temas para un proyecto',
  'temas para proyectos',
  'temas de proyecto',
  'temas de proyectos',
  'opciones de proyecto',
  'opciones de proyectos',
  'opciones de temas',
  'sobre qué puedo hacer un proyecto',
  'sobre que puedo hacer un proyecto',
  'qué podría hacer para un proyecto',
  'que podria hacer para un proyecto',
  'qué puedo hacer para un proyecto',
  'que puedo hacer para un proyecto',
  'temas para estudiar',
  'temas para aprender',
  'sugerencias de temas',
  'sugerencias de proyectos',
];

/**
 * Expresiones de confirmación o conformidad del usuario con una recomendación previa.
 */
const CONFIRM_RECOMMENDATION_TRIGGERS = [
  'sí',
  'si',
  'sí, de acuerdo',
  'si, de acuerdo',
  'de acuerdo',
  'estoy de acuerdo',
  'me parece bien',
  'me parece genial',
  'me parece excelente',
  'me parece perfecto',
  'me gusta',
  'me gusta esa idea',
  'me gusta esa',
  'me gusta ese',
  'me gusta la propuesta',
  'me gusta el tema',
  'vamos con esa',
  'vamos con ese',
  'vamos con esa idea',
  'vamos con ese tema',
  'quiero esa',
  'quiero ese',
  'quiero esa opción',
  'quiero esa opcion',
  'la primera opción',
  'la primera opcion',
  'la primera',
  'la segunda',
  'la tercera',
  'opción 1',
  'opcion 1',
  'opción 2',
  'opcion 2',
  'opción 3',
  'opcion 3',
  'esa me gusta',
  'ese me gusta',
  'perfecto, hagamos esa',
  'perfecto, esa',
  'sí, quiero esa',
  'si, quiero esa',
  'sí, me gustaría esa',
  'si, me gustaria esa',
  'avancemos con esa',
  'avancemos con ese',
  'me convence',
  'dale, hagamos esa',
  'dale, esa',
  'acepto',
  'sí por favor',
  'si por favor',
];

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
  'iniciar un proyecto',
  'empezar proyecto',
  'empezar un proyecto',
  'comenzar proyecto',
  'abrir un proyecto',
  'registrar un proyecto',
  'quiero crear un proyecto',
  'quiero hacer un proyecto',
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
 * Extrae título y objetivo sugerido a partir del texto del asistente o de la conversación.
 */
export function extractTopicFromText(text: string): { titulo: string; objetivo: string } {
  if (!text) {
    return {
      titulo: 'Proyecto de Aprendizaje',
      objetivo: 'Plan estructurado de estudio y práctica guiada',
    };
  }

  // 1. Buscar títulos encerrados en negrita **...**
  const boldMatches = Array.from(text.matchAll(/\*\*([^*]+)\*\*/g)).map((m) => m[1].trim());
  let candidateTitle = '';

  for (const b of boldMatches) {
    const lower = b.toLowerCase();
    if (
      !lower.startsWith('nombre') &&
      !lower.startsWith('objetivo') &&
      !lower.startsWith('opción') &&
      !lower.startsWith('opcion') &&
      !lower.startsWith('recurso') &&
      !lower.startsWith('nota') &&
      !lower.startsWith('plan') &&
      b.length >= 4 &&
      b.length <= 60
    ) {
      candidateTitle = b.replace(/^[\d\.\-\s\:\)]+/, '').trim();
      break;
    }
  }

  // 2. Si no se encontró en negritas, buscar patrones como "1. Título" o "Tema: Título"
  if (!candidateTitle) {
    const lineMatch = text.match(
      /(?:(?:proyecto|tema|propuesta)\s*(?:\d+)?[:\-]\s*|^\s*\d+[\.\)]\s*)([^\n\.\:]{4,50})/im,
    );
    if (lineMatch && lineMatch[1]) {
      candidateTitle = lineMatch[1].trim();
    }
  }

  if (!candidateTitle) {
    candidateTitle = 'Proyecto Recomendado';
  }

  // 3. Buscar objetivo definido explícitamente
  let candidateObjective = '';
  const objMatch = text.match(/(?:objetivo|meta|descripci[óo]n)[:\-]\s*([^\n]{10,250})/i);
  if (objMatch && objMatch[1]) {
    candidateObjective = objMatch[1].trim();
  } else {
    candidateObjective = `Aprender y aplicar los fundamentos y prácticas de ${candidateTitle}.`;
  }

  return {
    titulo: candidateTitle.slice(0, 50),
    objetivo: candidateObjective.slice(0, 250),
  };
}

/**
 * Analiza el mensaje del usuario y los proyectos existentes para determinar la intención.
 */
export function detectMessageIntent(
  userMessage: string,
  userProjects: Array<{ id: string; titulo: string }> = [],
  lastAssistantMessage?: {
    intent?: string;
    content?: string;
    suggestedTopicTitle?: string;
    suggestedTopicObjective?: string;
    contextData?: Record<string, unknown>;
  } | null,
): DetectedIntent {
  const normalized = userMessage.toLowerCase().trim();

  // 1. ¿El usuario está pidiendo recomendaciones de temas para proyectos? (Tiene máxima prioridad sobre crear)
  const hasTopicRecTrigger =
    TOPIC_RECOMMENDATION_TRIGGERS.some((tr) => normalized.includes(tr)) ||
    ((normalized.includes('recomiend') ||
      normalized.includes('sugier') ||
      normalized.includes('ideas') ||
      normalized.includes('idea')) &&
      (normalized.includes('tema') ||
        normalized.includes('proyecto') ||
        normalized.includes('estudiar') ||
        normalized.includes('aprender')));

  if (hasTopicRecTrigger) {
    return {
      intent: 'recommend_topics',
    };
  }

  // 2. ¿El usuario está confirmando/aceptando una recomendación previa del asistente?
  const isLastMessageRecommendation = Boolean(
    lastAssistantMessage?.intent === 'recommend_topics' ||
    lastAssistantMessage?.contextData?.isTopicRecommendation ||
    (lastAssistantMessage?.content &&
      (lastAssistantMessage.content.toLowerCase().includes('acuerdo') ||
        lastAssistantMessage.content.toLowerCase().includes('te parece') ||
        lastAssistantMessage.content.toLowerCase().includes('propuesta') ||
        lastAssistantMessage.content.toLowerCase().includes('recomiendo') ||
        lastAssistantMessage.content.toLowerCase().includes('recomendación'))),
  );

  const isConfirmationReply =
    CONFIRM_RECOMMENDATION_TRIGGERS.some(
      (tr) => normalized === tr || normalized.startsWith(`${tr} `) || normalized.includes(tr),
    ) ||
    normalized.startsWith('si') ||
    normalized.startsWith('sí') ||
    normalized.startsWith('de acuerdo') ||
    normalized.startsWith('me gusta');

  if (isLastMessageRecommendation && isConfirmationReply) {
    // Extraer o recuperar título y objetivo recomendado
    let topicTitle =
      lastAssistantMessage?.suggestedTopicTitle ||
      (lastAssistantMessage?.contextData?.suggestedTopicTitle as string | undefined);
    let topicObjective =
      lastAssistantMessage?.suggestedTopicObjective ||
      (lastAssistantMessage?.contextData?.suggestedTopicObjective as string | undefined);

    if (!topicTitle && lastAssistantMessage?.content) {
      const extracted = extractTopicFromText(lastAssistantMessage.content);
      topicTitle = extracted.titulo;
      topicObjective = extracted.objetivo;
    }

    return {
      intent: 'confirm_recommendation',
      suggestedTopic: {
        titulo: topicTitle || 'Proyecto Recomendado',
        objetivo: topicObjective || 'Plan de estudio propuesto por Komo IA',
      },
    };
  }

  // 3. Verificar si menciona explícitamente el nombre de alguno de los proyectos del usuario
  let matchedProject: { id: string; titulo: string } | undefined = undefined;
  for (const proj of userProjects) {
    const projTitleNorm = proj.titulo.toLowerCase().trim();
    if (projTitleNorm.length > 2 && normalized.includes(projTitleNorm)) {
      matchedProject = proj;
      break;
    }
  }

  // 4. Si pide crear explícitamente un proyecto o plan nuevo (sin que sea actualización de uno existente)
  const hasExplicitCreate =
    CREATE_PROJECT_TRIGGERS.some((tr) => normalized.includes(tr)) ||
    ((normalized.includes('crear') ||
      normalized.includes('crea') ||
      normalized.includes('nuevo')) &&
      (normalized.includes('proyecto') || normalized.includes('plan')));

  if (hasExplicitCreate && !matchedProject) {
    return {
      intent: 'create_project',
    };
  }

  // 5. Si menciona un proyecto existente o pide expresamente actualizar/agregar tareas a un proyecto
  const hasUpdateTrigger =
    UPDATE_PROJECT_TRIGGERS.some((tr) => normalized.includes(tr)) ||
    ((normalized.includes('actualiz') ||
      normalized.includes('agreg') ||
      normalized.includes('añad') ||
      normalized.includes('sumar') ||
      normalized.includes('incorpor')) &&
      (normalized.includes('tarea') || normalized.includes('proyecto')));

  if (
    hasUpdateTrigger ||
    (matchedProject &&
      (normalized.includes('tarea') ||
        normalized.includes('actualiz') ||
        normalized.includes('agreg') ||
        normalized.includes('añad')))
  ) {
    return {
      intent: 'update_project',
      targetProject: matchedProject || userProjects[0],
    };
  }

  // 6. Si pide crear y además coincidió con un proyecto existente
  if (hasExplicitCreate) {
    return {
      intent: 'update_project',
      targetProject: matchedProject || userProjects[0],
    };
  }

  // 7. Verificar si es una consulta meramente informativa
  const hasInformationalTrigger = INFORMATIONAL_TRIGGERS.some((tr) => normalized.includes(tr));
  if (hasInformationalTrigger && !normalized.includes('proyecto') && !normalized.includes('plan')) {
    return {
      intent: 'informational',
    };
  }

  // 8. Caso por defecto: Si no pidió proyectos ni tareas explícitamente, tratar como informativo
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
