import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  ExtractedScheduleBlock,
  ExtractedScheduleResponse,
} from '@/features/schedule/types/scheduleSchemas';

export interface ProjectForTaskGeneration {
  id: string;
  user_id: string;
  titulo: string;
  objetivo?: string | null;
  fecha_limite?: string | null;
  prioridad?: string | null;
  nivel_conocimiento?: string | null;
  material_url?: string | null;
  minutos_diarios?: number | null;
  file_content?: string | null;
  file_name?: string | null;
  existing_tasks?: Array<{
    id?: string;
    titulo: string;
    descripcion?: string | null;
    completado?: boolean | null;
    fecha_inicio?: string | null;
    duracion?: number | null;
  }> | null;
}

export interface GeneratedTaskCandidate {
  titulo?: string;
  title?: string;
  descripcion?: string;
  description?: string;
  duracion?: number | string;
  duration?: number | string;
  fecha_inicio?: string;
  startDate?: string;
  prioridad?: string;
  priority?: string;
  url_recomendada?: string;
  resources?: string;
  resourceUrl?: string;
  resource_url?: string;
  resourceName?: string;
  timeSlot?: string;
}

/**
 * Extrae URLs de recursos de un registro de tarea proveniente de n8n o IA,
 * soportando múltiples nombres de campos (resourceUrl, resource_url, resources, url, link, etc.),
 * arrays de strings u objetos, y fallback a escaneo de expresiones regulares.
 */
function extractResourcesFromRecord(record: Record<string, unknown>): string | undefined {
  if (!record || typeof record !== 'object') return undefined;

  const resourceKeys = [
    'resources',
    'resource',
    'resourceUrl',
    'resource_url',
    'url_recomendada',
    'urlRecomendada',
    'recommended_url',
    'recommendedUrl',
    'url',
    'urls',
    'link',
    'links',
    'enlace',
    'enlaces',
    'material',
    'materiales',
    'material_url',
    'materialUrl',
    'recurso',
    'recursos',
    'recurso_url',
    'recursoUrl',
    'source_url',
    'sourceUrl',
    'web_url',
    'webUrl',
    'href',
    'link_recomendado',
    'referencia',
    'documentacion',
    'docs',
  ];

  const foundUrls: string[] = [];

  const addUrl = (val: unknown) => {
    if (!val) return;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      const matches = trimmed.match(/https?:\/\/[^\s),"'>]+/gi);
      if (matches) {
        for (const m of matches) {
          if (!foundUrls.includes(m)) foundUrls.push(m);
        }
      } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        if (!foundUrls.includes(trimmed)) foundUrls.push(trimmed);
      }
    } else if (Array.isArray(val)) {
      for (const item of val) addUrl(item);
    } else if (typeof val === 'object' && val !== null) {
      const obj = val as Record<string, unknown>;
      if (obj.url) addUrl(obj.url);
      if (obj.resourceUrl) addUrl(obj.resourceUrl);
      if (obj.resource_url) addUrl(obj.resource_url);
      if (obj.link) addUrl(obj.link);
      if (obj.href) addUrl(obj.href);
      if (obj.enlace) addUrl(obj.enlace);
    }
  };

  for (const key of resourceKeys) {
    if (key in record && record[key]) {
      addUrl(record[key]);
    }
  }

  // Si no se encontró en las claves directas, escanear todos los campos del objeto
  if (foundUrls.length === 0) {
    for (const [, v] of Object.entries(record)) {
      if (typeof v === 'string') {
        const matches = v.match(/https?:\/\/[^\s),"'>]+/gi);
        if (matches) {
          for (const m of matches) {
            if (!foundUrls.includes(m)) foundUrls.push(m);
          }
        }
      }
    }
  }

  return foundUrls.length > 0 ? foundUrls.join(' ') : undefined;
}

/**
 * Normaliza la duración en minutos recibida de la IA (p. ej., "60 min", "1.5h", 45).
 */
function parseDurationMinutes(rawDuration: unknown, fallback: number): number {
  if (typeof rawDuration === 'number' && !isNaN(rawDuration) && rawDuration > 0) {
    return Math.round(rawDuration);
  }
  if (typeof rawDuration === 'string') {
    const trimmed = rawDuration.trim();
    const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h(?:ora(?:s)?)?/i);
    if (hourMatch && !trimmed.toLowerCase().includes('min')) {
      const hours = parseFloat(hourMatch[1]);
      if (!isNaN(hours) && hours > 0) return Math.round(hours * 60);
    }
    const minMatch = trimmed.match(/(\d+)\s*(?:m|min|minuto(?:s)?)?/i);
    if (minMatch) {
      const mins = parseInt(minMatch[1], 10);
      if (!isNaN(mins) && mins > 0) return mins;
    }
    const num = parseInt(trimmed.replace(/\D+/g, ''), 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return fallback;
}

/**
 * Extrae y parsea un array de tareas candidatas desde cualquier respuesta de n8n:
 * - Array de objetos con cualquier clave común (titulo, title, nombre, name, tarea, task, actividad, activity, item, etc.)
 * - Array de strings simples: ["Tarea 1", "Tarea 2", ...]
 * - Objeto con clave envolvente: { tareas: [...] }, { tasks: [...] }, { data: [...] }, { output: ... }, { body: ... }
 * - Bloque de código Markdown con JSON: ```json [...] ```
 * - Texto plano con lista numerada (1. ..., 2. ...) o viñetas (- ..., * ...)
 */
function parseTasksFromN8nResponse(rawResponse: unknown): GeneratedTaskCandidate[] {
  if (!rawResponse) return [];

  // 1. Si es un array
  if (Array.isArray(rawResponse)) {
    if (rawResponse.length === 0) return [];

    // Caso A: Array de strings simples ["Tarea 1", "Tarea 2"]
    if (typeof rawResponse[0] === 'string') {
      return (rawResponse as string[])
        .map((str) => str.trim())
        .filter(Boolean)
        .map((titulo) => ({ titulo }));
    }

    // Caso B: Array de objetos
    if (typeof rawResponse[0] === 'object' && rawResponse[0] !== null) {
      // Buscar si el primer elemento o algún elemento tiene claves de tarea
      const candidates: GeneratedTaskCandidate[] = [];
      let isTaskArray = false;

      for (const item of rawResponse) {
        if (typeof item !== 'object' || item === null) continue;
        const record = item as Record<string, unknown>;

        const titulo =
          record.titulo ||
          record.title ||
          record.nombre ||
          record.name ||
          record.tarea ||
          record.task ||
          record.actividad ||
          record.activity ||
          record.item ||
          record.label;

        const extractedUrl = extractResourcesFromRecord(record);

        if (titulo && typeof titulo === 'string') {
          isTaskArray = true;
          candidates.push({
            titulo: String(titulo),
            descripcion: String(
              record.descripcion || record.description || record.detalle || record.details || '',
            ),
            duracion: (record.duracion ||
              record.duration ||
              record.tiempo ||
              record.minutos ||
              record.time ||
              record.minutes ||
              record.duration_minutes) as number | string | undefined,
            fecha_inicio: (record.fecha_inicio ||
              record.startDate ||
              record.fecha ||
              record.date ||
              record.due_date) as string | undefined,
            prioridad: (record.prioridad || record.priority) as string | undefined,
            url_recomendada: extractedUrl,
            resources: extractedUrl,
            resourceUrl: extractedUrl,
            resourceName: record.resourceName ? String(record.resourceName) : undefined,
            timeSlot: (record.timeSlot || record.time_slot) as string | undefined,
          });
        }
      }

      if (isTaskArray && candidates.length > 0) {
        return candidates;
      }

      // Si no era un array de tareas directamente, puede ser el formato de n8n [ { output: ... } ] o [ { json: ... } ]
      const first = rawResponse[0] as Record<string, unknown>;
      for (const nestedKey of [
        'tasks',
        'tareas',
        'items',
        'data',
        'plan',
        'output',
        'json',
        'reply',
        'text',
        'message',
        'response',
        'result',
        'body',
      ]) {
        if (first[nestedKey]) {
          const nestedResult = parseTasksFromN8nResponse(first[nestedKey]);
          if (nestedResult.length > 0) return nestedResult;
        }
      }
    }
  }

  // 2. Si es un string (puede ser texto o JSON serializado)
  if (typeof rawResponse === 'string') {
    const trimmed = rawResponse.trim();

    // Intentar buscar bloque markdown ```json ... ```
    const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const contentToParse = markdownMatch ? markdownMatch[1].trim() : trimmed;

    try {
      const parsed = JSON.parse(contentToParse);
      const res = parseTasksFromN8nResponse(parsed);
      if (res.length > 0) return res;
    } catch {
      // Buscar array JSON dentro del texto
      const arrayMatch = contentToParse.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        try {
          const parsed = JSON.parse(arrayMatch[0]);
          const res = parseTasksFromN8nResponse(parsed);
          if (res.length > 0) return res;
        } catch {
          // Ignorar error y probar con lista de texto
        }
      }
    }

    // Si no se pudo parsear como JSON, intentar parsear lista de texto con viñetas o números
    const lines = trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const textTasks: GeneratedTaskCandidate[] = [];

    for (const line of lines) {
      // Coincide con "1. Tarea", "1) Tarea", "- Tarea", "* Tarea", "• Tarea"
      const match = line.match(/^(?:(?:\d+[\.\)])|[-*•])\s*(.+)$/);
      if (match && match[1].trim().length > 2) {
        const fullContent = match[1].trim().replace(/^\*\*|\*\*$/g, '');
        const urlMatches = fullContent.match(/https?:\/\/[^\s),"'>]+/gi);
        const lineUrl = urlMatches && urlMatches.length > 0 ? urlMatches.join(' ') : undefined;

        // Si tiene formato "Título: Descripción"
        const parts = fullContent.split(/:\s+/);
        if (parts.length > 1) {
          textTasks.push({
            titulo: parts[0].trim(),
            descripcion: parts.slice(1).join(': ').trim(),
            resources: lineUrl,
            url_recomendada: lineUrl,
            resourceUrl: lineUrl,
          });
        } else {
          textTasks.push({
            titulo: fullContent,
            resources: lineUrl,
            url_recomendada: lineUrl,
            resourceUrl: lineUrl,
          });
        }
      }
    }

    if (textTasks.length > 0) {
      return textTasks;
    }
  }

  // 3. Si es un objeto genérico
  if (typeof rawResponse === 'object' && rawResponse !== null) {
    const obj = rawResponse as Record<string, unknown>;

    for (const key of [
      'tasks',
      'tareas',
      'items',
      'data',
      'plan',
      'output',
      'rows',
      'result',
      'reply',
      'text',
      'response',
      'message',
      'body',
    ]) {
      if (key in obj && obj[key]) {
        const candidate = parseTasksFromN8nResponse(obj[key]);
        if (candidate.length > 0) return candidate;
      }
    }
  }

  return [];
}

/**
 * Calcula fechas de inicio sucesivas (una por día hábil a las 09:00 AM)
 * para evitar colisiones de horario entre tareas generadas automáticamente.
 * Si se pasa startDate, comienza a partir del día siguiente a esa fecha.
 */
function calculateDefaultStartDates(count: number, startDate?: string | Date): string[] {
  const dates: string[] = [];
  const base = startDate ? new Date(startDate) : new Date();
  base.setDate(base.getDate() + 1); // Comenzar a partir del día siguiente

  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    d.setHours(9, 0, 0, 0); // 09:00 AM
    dates.push(d.toISOString());
  }

  return dates;
}

/**
 * Genera tareas para un proyecto llamando al webhook configurado en n8n
 * e insertándolas en la tabla 'tareas' de Supabase.
 */
export async function generateProjectTasksFromN8n(project: ProjectForTaskGeneration) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    console.warn('generateProjectTasksFromN8n: N8N_WEBHOOK_URL no está definida.');
    return {
      success: false,
      error: 'La URL del webhook de n8n no está configurada en las variables de entorno.',
    };
  }

  try {
    // 1. Preparar mensaje explicito para el Agente/Chatbot de n8n
    const existingTasks = project.existing_tasks || [];
    const hasExisting = existingTasks.length > 0;

    let existingTasksPrompt = '';
    if (hasExisting) {
      existingTasksPrompt =
        `\n\nTAREAS ACTUALES YA CREADAS EN ESTE PROYECTO (${existingTasks.length} tareas existentes que el usuario YA TIENE):\n` +
        existingTasks
          .map(
            (t, idx) =>
              `- Tarea existente ${idx + 1}: "${t.titulo}" (${t.completado ? 'Completada' : 'Pendiente'})${
                t.descripcion ? ` - ${t.descripcion}` : ''
              }`,
          )
          .join('\n') +
        `\n\nREQUISITO OBLIGATORIO DE CONTINUIDAD:\n` +
        `El usuario ya tiene registradas las tareas anteriores. NO repitas ninguna de esas tareas bajo ninguna circunstancia ni generes tareas equivalentes. ` +
        `Genera ÚNICAMENTE un conjunto de tareas NUEVAS y DIFERENTES que continúen la progresión a partir de la última tarea existente, ` +
        `avanzando hacia los siguientes pasos, conceptos o prácticas para cumplir el objetivo del proyecto.`;
    }

    const materialPart = project.material_url
      ? ` Recurso o enlace de referencia suministrado: ${project.material_url}.`
      : '';
    const filePart = project.file_content
      ? ` Documento de referencia adjunto ("${project.file_name || 'archivo'}"):\n--- INICIO DEL DOCUMENTO ---\n${project.file_content}\n--- FIN DEL DOCUMENTO ---\nPor favor toma en cuenta este documento para extraer o estructurar las tareas del proyecto.`
      : '';

    // Cálculo previo de días restantes y carga total de estudio
    let diasRestantes: number | null = null;
    let semanasRestantes: number | null = null;
    let horasTotalesEstimadas: number | null = null;
    let tiempoInfo = '';

    const minutosDiarios = project.minutos_diarios || 30;

    if (project.fecha_limite) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const deadline = new Date(project.fecha_limite);
      deadline.setHours(0, 0, 0, 0);
      const diffMs = deadline.getTime() - now.getTime();
      const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      diasRestantes = diffDays;
      semanasRestantes = Math.max(1, Math.round((diffDays / 7) * 10) / 10);
      horasTotalesEstimadas = Math.round((diffDays * minutosDiarios) / 60);

      const fechaStr = project.fecha_limite.includes('T')
        ? project.fecha_limite.split('T')[0]
        : project.fecha_limite;

      tiempoInfo =
        `\n\nCÁLCULO PREVIO DE TIEMPO, PLAZO Y CARGA:\n` +
        `- Plazo disponible hasta la fecha límite (${fechaStr}): ${diasRestantes} días (~${semanasRestantes} semanas).\n` +
        `- Dedicación configurada por el usuario: ${minutosDiarios} minutos diarios (~${horasTotalesEstimadas} horas de trabajo en total durante todo el proyecto).\n` +
        `- DIRECTRIZ OBLIGATORIA DE TAREAS: Debes generar una cantidad suficiente, proporcional y realista de tareas para abarcar todo este periodo de ${diasRestantes} días sin quedarte corto (no te limites a solo 3 o 4 tareas si el plazo es amplio). Cada tarea debe poder realizarse en aproximadamente ${minutosDiarios} minutos diarios. Distribuye el temario de manera progresiva hacia la meta.`;
    }

    const promptMessage = hasExisting
      ? `Genera las SIGUIENTES tareas de continuidad para el proyecto: "${project.titulo}". Objetivo: ${project.objetivo || 'Avanzar en el aprendizaje'}. Nivel de conocimiento actual: ${project.nivel_conocimiento || 'Principiante'}. Minutos diarios disponibles: ${minutosDiarios}. Fecha límite: ${project.fecha_limite || 'Flexible'}.${tiempoInfo}${materialPart}${filePart}${existingTasksPrompt}\n\nPor favor genera tareas estructuradas completamente NUEVAS sin duplicar nada anterior. Para cada tarea, incluye una URL o enlace recomendado en el campo "resourceUrl" o "resources".`
      : `Genera un plan de tareas detallado para el proyecto: "${project.titulo}". Objetivo: ${project.objetivo || 'Avanzar en el aprendizaje'}. Nivel de conocimiento actual: ${project.nivel_conocimiento || 'Principiante'}. Minutos diarios disponibles: ${minutosDiarios}. Fecha límite: ${project.fecha_limite || 'Flexible'}.${tiempoInfo}${materialPart}${filePart} Por favor genera el listado de tareas estructurado acorde al plazo calculado. Para cada tarea, incluye obligatoriamente una URL o enlace recomendado (documentación oficial, tutorial o recurso web) en el campo "resourceUrl" o "resources".`;

    // 2. Preparar payload completo con compatibilidad para nodos de Supabase (userId, user_id) y agentes de chat (chatInput, message)
    const payload = {
      // Identificadores de usuario
      userId: project.user_id,
      user_id: project.user_id,
      sessionId: project.user_id,

      // Identificadores de proyecto
      projectId: project.id,
      id: project.id,
      id_proyecto: project.id,

      // Datos directos de la tabla 'projects'
      titulo: project.titulo,
      objetivo: project.objetivo || '',
      fecha_limite: project.fecha_limite || null,
      prioridad: project.prioridad || 'Prioritario',
      nivel_conocimiento: project.nivel_conocimiento || '',
      material_url: project.material_url || null,
      archivo_nombre: project.file_name || null,
      archivo_contenido: project.file_content || null,
      minutos_diarios: minutosDiarios,

      // Datos calculados de plazo y carga
      dias_restantes: diasRestantes,
      semanas_restantes: semanasRestantes,
      horas_totales_estimadas: horasTotalesEstimadas,

      // Tareas ya existentes para prevenir duplicación
      tareas_existentes: existingTasks.map((t) => ({
        titulo: t.titulo,
        descripcion: t.descripcion,
        completado: Boolean(t.completado),
      })),
      cantidad_tareas_existentes: existingTasks.length,

      // Mensaje de entrada para Agentes de n8n (Chat Trigger / AI Agent)
      chatInput: promptMessage,
      message: promptMessage,
      prompt: promptMessage,
      input: promptMessage,

      // Claves de Gemini para que el servidor de n8n las utilice o rote si tiene cuota agotada
      geminiApiKey: process.env.GEMINI_API_KEY || null,
      geminiApiKey2: process.env.GEMINI_API_KEY_2 || null,
      geminiApiKey3: process.env.GEMINI_API_KEY_3 || null,
      geminiApiKeys: [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
      ].filter(Boolean) as string[],
    };


    // 2. Llamada HTTP al Webhook de n8n con timeout de 60 segundos (permite procesar videos y temarios extensos)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/plain, */*',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`n8n webhook respondió con código ${response.status}:`, errorText);
      return {
        success: false,
        error: `El servicio de n8n respondió con error (${response.status}). Verifica que el workflow esté activo.`,
      };
    }

    // 3. Procesar cuerpo de la respuesta de n8n
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();
    console.log(
      '[n8n] HTTP Status:',
      response.status,
      '| Content-Type:',
      contentType,
      '| Raw Body:',
      rawText,
    );

    let responseBody: unknown = rawText;
    if (rawText && rawText.trim().length > 0) {
      try {
        responseBody = JSON.parse(rawText);
      } catch {
        responseBody = rawText;
      }
    }

    // 4. Parsear las tareas candidatas
    const taskCandidates = parseTasksFromN8nResponse(responseBody);

    const supabase = await createClient();
    const adminDb = getAdminClient();
    const db = adminDb || supabase;

    if (!taskCandidates || taskCandidates.length === 0) {
      // Si n8n no devolvió las tareas en el JSON, verificar si su nodo de Supabase las insertó directamente en la BD
      const { data: dbTasks } = await db.from('tareas').select('*').eq('id_proyecto', project.id);

      if (dbTasks && dbTasks.length > 0) {
        return {
          success: true,
          count: dbTasks.length,
          tasks: dbTasks,
          progreso: 0,
        };
      }

      console.warn('Respuesta recibida de n8n sin tareas estructuradas:', responseBody);
      const rawPreview =
        typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
      const snippet =
        rawPreview && rawPreview.length > 250
          ? `${rawPreview.slice(0, 250)}...`
          : rawPreview || 'vacía';

      return {
        success: false,
        error: `La IA de n8n no devolvió tareas en un formato interpretable. Respuesta de n8n: ${snippet}`,
      };
    }

    // 5. Normalizar y desduplicar datos para la tabla 'tareas' de Supabase
    const existingTitlesSet = new Set(
      existingTasks.map((t) =>
        t.titulo
          .toLowerCase()
          .trim()
          .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ''),
      ),
    );

    // Filtrar candidatos cuyo título sea idéntico o muy similar a una tarea existente
    let candidatesToUse = taskCandidates.filter((c) => {
      const norm = (c.titulo || c.title || '')
        .toLowerCase()
        .trim()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
      return norm.length > 0 && !existingTitlesSet.has(norm);
    });

    // Si todas las candidatas devueltas eran duplicadas, diferenciarlas con sufijo de fase
    if (candidatesToUse.length === 0 && taskCandidates.length > 0) {
      candidatesToUse = taskCandidates.map((c, i) => ({
        ...c,
        titulo: `${c.titulo || c.title || 'Tarea'} (Continuación ${existingTasks.length + i + 1})`,
      }));
    }

    // Calcular la fecha base posterior a la última tarea existente para evitar solapamientos
    let latestExistingDate: Date | null = null;
    for (const t of existingTasks) {
      if (t.fecha_inicio) {
        const d = new Date(t.fecha_inicio);
        if (!isNaN(d.getTime())) {
          if (!latestExistingDate || d > latestExistingDate) {
            latestExistingDate = d;
          }
        }
      }
    }

    const defaultDates = calculateDefaultStartDates(
      candidatesToUse.length,
      latestExistingDate || undefined,
    );
    const defaultDuration = Math.max(10, Number(project.minutos_diarios) || 30);

    const tasksToInsert = candidatesToUse.map((candidate, index) => {
      const titulo = (candidate.titulo || candidate.title || `Tarea ${index + 1}`).trim();
      const descripcion = (candidate.descripcion || candidate.description || '').trim() || null;
      const duracion = parseDurationMinutes(
        candidate.duracion || candidate.duration,
        defaultDuration,
      );

      let fechaInicio: string | null = null;
      const rawDate = candidate.fecha_inicio || candidate.startDate;
      if (rawDate) {
        const d = new Date(rawDate);
        fechaInicio = !isNaN(d.getTime()) ? d.toISOString() : defaultDates[index];
      } else {
        const defaultDate = new Date(defaultDates[index]);
        if (candidate.timeSlot) {
          const timeMatch = candidate.timeSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3]?.toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            defaultDate.setHours(hours, minutes, 0, 0);
          }
        }
        fechaInicio = defaultDate.toISOString();
      }

      const resources =
        (
          candidate.resources ||
          candidate.resourceUrl ||
          candidate.resource_url ||
          candidate.url_recomendada ||
          ''
        ).trim() ||
        (project.material_url?.trim() ?? null) ||
        null;
      const prioridad =
        candidate.prioridad || candidate.priority || project.prioridad || 'Prioritario';

      return {
        id: crypto.randomUUID(),
        id_proyecto: project.id,
        titulo,
        descripcion,
        duracion,
        completado: false,
        fecha_inicio: fechaInicio,
        prioridad,
        resources,
      };
    });

    // 6. Conectar a Supabase e insertar en lote
    const { data: insertedTasks, error: insertError } = await db
      .from('tareas')
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error('Error insertando tareas en Supabase:', insertError);
      return {
        success: false,
        error: `Error al guardar tareas generadas en Supabase: ${insertError.message}`,
      };
    }

    // 7. Recalcular el progreso del proyecto
    const { data: allTasks } = await db
      .from('tareas')
      .select('completado')
      .eq('id_proyecto', project.id);

    let newProgreso = 0;
    if (allTasks && allTasks.length > 0) {
      const completedCount = allTasks.filter((t) => t.completado).length;
      newProgreso = Math.round((completedCount / allTasks.length) * 100);
    }

    await db
      .from('projects')
      .update({ progreso: newProgreso, completado: false })
      .eq('id', project.id);

    return {
      success: true,
      count: insertedTasks?.length || tasksToInsert.length,
      tasks: insertedTasks || tasksToInsert,
      progreso: newProgreso,
    };
  } catch (error: unknown) {
    console.error('Error en generateProjectTasksFromN8n:', error);
    const msg = error instanceof Error ? error.message : 'Error de conexión con el webhook de n8n';
    return { success: false, error: msg };
  }
}

function normalizeDayOfWeek(dia: unknown): number {
  if (typeof dia === 'number' && Number.isInteger(dia) && dia >= 0 && dia <= 6) {
    return dia;
  }
  const str = String(dia || '').toLowerCase().trim();
  if (str.includes('dom') || str === '0') return 0;
  if (str.includes('lun') || str === '1') return 1;
  if (str.includes('mar') || str === '2') return 2;
  if (str.includes('mie') || str.includes('mié') || str === '3') return 3;
  if (str.includes('jue') || str === '4') return 4;
  if (str.includes('vie') || str === '5') return 5;
  if (str.includes('sab') || str.includes('sáb') || str === '6') return 6;
  return 1;
}

function normalizeTimeSlot(time: unknown): string {
  const str = String(time || '').trim();
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = match[2];
    return `${h}:${m}`;
  }
  return '08:00';
}

function normalizeType(
  tipo: unknown,
): 'ocupado' | 'tareas' | 'estudio' | 'trabajo' | 'otra_actividad' {
  const str = String(tipo || '').toLowerCase().trim();
  if (
    str.includes('estud') ||
    str.includes('clase') ||
    str.includes('materia') ||
    str.includes('universidad')
  ) {
    return 'estudio';
  }
  if (str.includes('trabaj') || str.includes('laboral')) {
    return 'trabajo';
  }
  if (str.includes('tarea') || str.includes('libre')) {
    return 'tareas';
  }
  if (str.includes('ocupad')) {
    return 'ocupado';
  }
  return 'otra_actividad';
}

function parseScheduleFromN8nResponse(rawResponse: unknown): ExtractedScheduleBlock[] {
  if (!rawResponse) return [];

  // 1. Si es un array
  if (Array.isArray(rawResponse)) {
    if (rawResponse.length === 0) return [];

    const blocks: ExtractedScheduleBlock[] = [];
    for (const item of rawResponse) {
      if (typeof item !== 'object' || item === null) continue;
      const rec = item as Record<string, unknown>;
      if (
        rec.hora_inicio ||
        rec.horaInicio ||
        rec.start ||
        rec.inicio ||
        rec.hora_fin ||
        rec.horaFin ||
        rec.end ||
        rec.fin
      ) {
        blocks.push({
          dia_semana: normalizeDayOfWeek(rec.dia_semana ?? rec.diaSemana ?? rec.dia ?? rec.day),
          hora_inicio: normalizeTimeSlot(
            rec.hora_inicio ?? rec.horaInicio ?? rec.start ?? rec.inicio,
          ),
          hora_fin: normalizeTimeSlot(rec.hora_fin ?? rec.horaFin ?? rec.end ?? rec.fin),
          tipo: normalizeType(rec.tipo ?? rec.type),
          etiqueta: String(
            rec.etiqueta ??
              rec.label ??
              rec.materia ??
              rec.titulo ??
              rec.nombre ??
              'Clase/Actividad',
          ),
        });
      }
    }

    if (blocks.length > 0) return blocks;

    // Si es un formato envoltorio de n8n [ { json: ... } ] o [ { output: ... } ]
    const first = rawResponse[0] as Record<string, unknown>;
    for (const key of [
      'bloques',
      'schedule',
      'horario',
      'output',
      'json',
      'data',
      'reply',
      'text',
      'message',
      'response',
    ]) {
      if (first[key]) {
        const nested = parseScheduleFromN8nResponse(first[key]);
        if (nested.length > 0) return nested;
      }
    }
  }

  // 2. Si es un string (JSON serializado o Markdown)
  if (typeof rawResponse === 'string') {
    const trimmed = rawResponse.trim();
    const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const contentToParse = markdownMatch ? markdownMatch[1].trim() : trimmed;

    try {
      const parsed = JSON.parse(contentToParse);
      const res = parseScheduleFromN8nResponse(parsed);
      if (res.length > 0) return res;
    } catch {
      const jsonMatch = contentToParse.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const res = parseScheduleFromN8nResponse(parsed);
          if (res.length > 0) return res;
        } catch {
          // Ignorar y continuar
        }
      }
    }
  }

  // 3. Si es un objeto directo
  if (typeof rawResponse === 'object' && rawResponse !== null) {
    const rec = rawResponse as Record<string, unknown>;
    for (const key of [
      'bloques',
      'schedule',
      'horario',
      'clases',
      'output',
      'json',
      'data',
      'result',
      'body',
    ]) {
      if (rec[key]) {
        const nested = parseScheduleFromN8nResponse(rec[key]);
        if (nested.length > 0) return nested;
      }
    }
  }

  return [];
}

/**
 * Extrae bloques de horario enviando el archivo al webhook de n8n cuando Gemini
 * tarda más de 5-10 segundos o experimenta problemas de lectura.
 */
export async function extractScheduleFromN8n(params: {
  base64Data: string;
  mimeType: string;
  usuarioId?: string;
  nombreArchivo?: string;
}): Promise<ExtractedScheduleResponse> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    throw new Error('N8N_WEBHOOK_URL no está configurada en las variables de entorno.');
  }

  const promptMessage = `Analiza la imagen o documento adjunto correspondiente a un horario laboral, académico, universitario o escolar.
Extrae minuciosamente todos los bloques de clases, materias, asignaturas, turnos o actividades con su día de la semana y horas de inicio y fin.
Instrucciones clave:
1. Mapea el día a un número: 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado.
2. Cada bloque debe tener hora_inicio y hora_fin en formato militar HH:MM (ejemplo "08:00", "10:30", "14:00").
3. Clasifica el campo "tipo" exactamente como una de estas opciones: "ocupado", "estudio", "trabajo" o "otra_actividad" (usa "estudio" u "ocupado" para materias de clase).
4. En "etiqueta" coloca el nombre de la materia o actividad (ej. "Cálculo I", "Física", "Laboratorio", "Programación").
Devuelve un JSON con la estructura:
{
  "bloques": [
    {
      "dia_semana": 1,
      "hora_inicio": "08:00",
      "hora_fin": "10:00",
      "tipo": "estudio",
      "etiqueta": "Matemáticas"
    }
  ],
  "observaciones": "Horario extraído con IA vía n8n"
}`;

  const payload = {
    sessionId: params.usuarioId || 'calendar-schedule',
    userId: params.usuarioId || 'calendar-schedule',
    user_id: params.usuarioId || 'calendar-schedule',
    chatInput: promptMessage,
    message: promptMessage,
    mensaje: promptMessage,
    input: promptMessage,
    prompt: promptMessage,
    tipo_evento: 'extraccion_horario',
    archivo_nombre: params.nombreArchivo || 'horario',
    archivo: {
      nombre: params.nombreArchivo || 'horario',
      tipo: params.mimeType,
      contenido: params.base64Data,
    },
    archivo_base64: params.base64Data,
    base64Data: params.base64Data,
    mimeType: params.mimeType,

    // Claves de Gemini para que el servidor de n8n las utilice o rote si tiene cuota agotada
    geminiApiKey: process.env.GEMINI_API_KEY || null,
    geminiApiKey2: process.env.GEMINI_API_KEY_2 || null,
    geminiApiKey3: process.env.GEMINI_API_KEY_3 || null,
    geminiApiKeys: [
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
    ].filter(Boolean) as string[],
  };


  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`n8n webhook respondió con código ${response.status}: ${errorText}`);
    }

    const rawText = await response.text();
    let parsedJson: unknown = null;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      parsedJson = rawText;
    }

    const extractedBlocks = parseScheduleFromN8nResponse(parsedJson);

    if (extractedBlocks.length === 0) {
      throw new Error('La IA de n8n no devolvió bloques de horario interpretables.');
    }

    return {
      bloques: extractedBlocks,
      observaciones: 'Horario extraído exitosamente con n8n tras timeout de Gemini.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
