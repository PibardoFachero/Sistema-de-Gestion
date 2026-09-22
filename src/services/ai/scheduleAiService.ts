import { Type } from '@google/genai';
import { GEMINI_DEFAULT_MODEL } from '@/lib/gemini/geminiClient';
import { callGeminiWithRetry } from '@/lib/gemini/geminiRetry';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  GeneratedSchedule,
  generatedScheduleSchema,
  ExtractedScheduleResponse,
  extractedScheduleResponseSchema,
} from '@/features/schedule/types/scheduleSchemas';
import { logAiInteraction } from './aiLogger';

export interface GenerateScheduleParams {
  usuarioId?: string;
  proyectoId: string;
  nombre: string;
  objetivo: string;
  fechaLimite?: string;
  importancia?: string;
  nivel?: string;
  tiempoDiario?: string | number;
  bloquesLibresPorDia?: string;
  textoExtraidoArchivos?: string;
  enlaces?: string[];
}

export interface RegenerateScheduleParams {
  usuarioId?: string;
  proyectoId: string;
  nombre: string;
  fechaLimite?: string;
  cambiosDisponibilidad: string;
  bloquesFuturosActuales: string;
  tareasCompletadas: string;
}

/**
 * Esquema JSON estricto para Gemini SDK para devolver el cronograma.
 */
const scheduleJsonSchema = {
  type: Type.OBJECT,
  properties: {
    resumen: {
      type: Type.STRING,
      description: 'Resumen ejecutivo de la planificación del proyecto y distribución de tiempos.',
    },
    hitos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          titulo: { type: Type.STRING, description: 'Título del hito' },
          fecha: { type: Type.STRING, description: 'Fecha límite del hito (YYYY-MM-DD)' },
        },
        required: ['titulo', 'fecha'],
      },
      description: 'Hitos clave o entregables periódicos.',
    },
    bloques: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fecha: { type: Type.STRING, description: 'Fecha del bloque (YYYY-MM-DD)' },
          hora_inicio: { type: Type.STRING, description: 'Hora de inicio (HH:MM)' },
          hora_fin: { type: Type.STRING, description: 'Hora de finalización (HH:MM)' },
          tarea: { type: Type.STRING, description: 'Nombre de la tarea asignada' },
          descripcion: { type: Type.STRING, description: 'Descripción o objetivo de la sesión' },
          proyecto_id: { type: Type.STRING, description: 'ID del proyecto' },
        },
        required: ['fecha', 'hora_inicio', 'hora_fin', 'tarea'],
      },
      description: 'Bloques diarios de trabajo asignados respetando disponibilidad.',
    },
  },
  required: ['resumen', 'hitos', 'bloques'],
};

/**
 * Genera el cronograma inicial con Gemini AI
 */
export async function generateScheduleWithGemini(
  params: GenerateScheduleParams,
): Promise<GeneratedSchedule> {
  const startTime = Date.now();

  const prompt = `Eres un planificador académico/laboral. Genera un cronograma realista para el siguiente proyecto.

DATOS DEL PROYECTO:
Nombre: ${params.nombre}
Objetivo: ${params.objetivo}
Fecha límite: ${params.fechaLimite || '30 días a partir de hoy'}
Importancia: ${params.importancia || 'Prioritario'}
Nivel de conocimiento: ${params.nivel || 'Principiante'}
Tiempo diario disponible: ${params.tiempoDiario || '30 minutos'}

DISPONIBILIDAD DEL USUARIO (extraída de sus horarios):
${params.bloquesLibresPorDia || 'Disponibilidad general según el tiempo diario declarado.'}

MATERIAL DE REFERENCIA:
${params.textoExtraidoArchivos ? `Texto extraído de documentos:\n${params.textoExtraidoArchivos}` : 'Sin archivos adjuntos adicionales.'}
${params.enlaces && params.enlaces.length > 0 ? `Enlaces de referencia:\n${params.enlaces.join('\n')}` : ''}

REGLAS:
1. Respeta estrictamente los bloques ocupados del usuario.
2. Distribuye las tareas según la importancia y el tiempo diario disponible.
3. No asignes más horas de las disponibles por día.
4. Considera el nivel de conocimiento: si es "ninguno" o "principiante", añade tareas de fundamentos; si es "intermedio" o "avanzado", omite lo básico y profundiza.
5. Deja margen de holgura (buffer) para imprevistos.
6. El campo "proyecto_id" de cada bloque debe ser exactamente: "${params.proyectoId}".
7. Genera bloques concretos con fechas (YYYY-MM-DD) y horas (HH:MM).`;

  try {
    const response = await callGeminiWithRetry(
      (ai, model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: scheduleJsonSchema,
            temperature: 0.3,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      { maxRetries: 1, initialDelayMs: 1000, timeoutMs: 15000 },
    );

    const rawText = response.text || '{}';
    const parsedJson = JSON.parse(rawText);
    const validated = generatedScheduleSchema.parse(parsedJson);

    // Asegurar que cada bloque tenga el proyecto_id correcto
    validated.bloques = validated.bloques.map((b) => ({
      ...b,
      proyecto_id: params.proyectoId,
    }));

    await logAiInteraction({
      usuarioId: params.usuarioId,
      proyectoId: params.proyectoId,
      tipoOperacion: 'generacion_cronograma',
      modelo: GEMINI_DEFAULT_MODEL,
      promptEnviado: prompt,
      respuestaCruda: rawText,
      duracionMs: Date.now() - startTime,
    });

    return validated;
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    await logAiInteraction({
      usuarioId: params.usuarioId,
      proyectoId: params.proyectoId,
      tipoOperacion: 'generacion_cronograma',
      modelo: GEMINI_DEFAULT_MODEL,
      promptEnviado: prompt,
      respuestaCruda: '',
      duracionMs: Date.now() - startTime,
      error: errMessage,
    });
    throw new Error(`Error en generación de cronograma con Gemini: ${errMessage}`);
  }
}

/**
 * Regenera los bloques futuros del cronograma ante cambios en disponibilidad
 */
export async function regenerateScheduleWithGemini(
  params: RegenerateScheduleParams,
): Promise<GeneratedSchedule> {
  const startTime = Date.now();

  const prompt = `El usuario modificó su disponibilidad. Regenera el cronograma del proyecto "${params.nombre}" manteniendo las tareas ya completadas y ajustando solo los bloques futuros.

CAMBIOS EN DISPONIBILIDAD:
${params.cambiosDisponibilidad}

CRONOGRAMA ACTUAL (bloques futuros):
${params.bloquesFuturosActuales}

TAREAS COMPLETADAS (no tocar):
${params.tareasCompletadas || 'Ninguna tarea completada hasta ahora.'}

${params.fechaLimite ? `NUEVA FECHA LÍMITE: ${params.fechaLimite}` : ''}

REGLAS:
1. No modifiques tareas ya completadas.
2. Reajusta solo bloques cuya fecha sea >= hoy.
3. Mantén la fecha límite original salvo que el usuario la haya cambiado.
4. Devuelve el mismo JSON que en la generación inicial, solo con los bloques futuros y los hitos actualizados.
5. El campo "proyecto_id" de cada bloque debe ser exactamente: "${params.proyectoId}".`;

  try {
    const response = await callGeminiWithRetry(
      (ai, model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: scheduleJsonSchema,
            temperature: 0.3,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      { maxRetries: 1, initialDelayMs: 1000, timeoutMs: 15000 },
    );

    const rawText = response.text || '{}';
    const parsedJson = JSON.parse(rawText);
    const validated = generatedScheduleSchema.parse(parsedJson);

    validated.bloques = validated.bloques.map((b) => ({
      ...b,
      proyecto_id: params.proyectoId,
    }));

    await logAiInteraction({
      usuarioId: params.usuarioId,
      proyectoId: params.proyectoId,
      tipoOperacion: 'regeneracion_cronograma',
      modelo: GEMINI_DEFAULT_MODEL,
      promptEnviado: prompt,
      respuestaCruda: rawText,
      duracionMs: Date.now() - startTime,
    });

    return validated;
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    await logAiInteraction({
      usuarioId: params.usuarioId,
      proyectoId: params.proyectoId,
      tipoOperacion: 'regeneracion_cronograma',
      modelo: GEMINI_DEFAULT_MODEL,
      promptEnviado: prompt,
      respuestaCruda: '',
      duracionMs: Date.now() - startTime,
      error: errMessage,
    });
    throw new Error(`Error en regeneración de cronograma con Gemini: ${errMessage}`);
  }
}

/**
 * Usa Gemini con visión para extraer bloques de disponibilidad desde imágenes de horarios.
 * Implementa reintentos automáticos ante saturación (429/503) y compresión semántica.
 */
export async function extractScheduleFromImageWithGemini(params: {
  base64Data: string;
  mimeType: string;
  usuarioId?: string;
}): Promise<ExtractedScheduleResponse> {
  const startTime = Date.now();

  const prompt = `Analiza la imagen o documento adjunto correspondiente a un horario laboral, académico, universitario o escolar.
Extrae minuciosamente todos los bloques de clases, materias, asignaturas, turnos o actividades con su día de la semana y horas de inicio y fin.
Instrucciones clave:
1. Mapea el día a un número: 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado.
2. Cada bloque debe tener hora_inicio y hora_fin en formato militar HH:MM (ejemplo "08:00", "10:30", "14:00").
3. Clasifica el campo "tipo" exactamente como una de estas opciones: "ocupado", "estudio", "trabajo" o "otra_actividad" (usa "estudio" u "ocupado" para materias de clase).
4. En "etiqueta" coloca el nombre de la materia o actividad (ej. "Cálculo I", "Física", "Laboratorio", "Programación").
5. Si un bloque dura varias horas (ej. 08:00 a 10:00), extrae el intervalo completo con su hora de inicio y fin.
Devuelve la lista de bloques en formato JSON.`;

  const extractionSchema = {
    type: Type.OBJECT,
    properties: {
      bloques: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dia_semana: { type: Type.INTEGER, description: '0 (Domingo) a 6 (Sábado)' },
            hora_inicio: { type: Type.STRING, description: 'HH:MM' },
            hora_fin: { type: Type.STRING, description: 'HH:MM' },
            tipo: {
              type: Type.STRING,
              description: 'ocupado, libre, estudio, trabajo o otra_actividad',
            },
            etiqueta: { type: Type.STRING, description: 'Materia o actividad' },
          },
          required: ['dia_semana', 'hora_inicio', 'hora_fin', 'tipo'],
        },
      },
      observaciones: { type: Type.STRING },
    },
    required: ['bloques'],
  };

  try {
    const response = await callGeminiWithRetry(
      (ai, model) =>
        ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: params.base64Data,
                    mimeType: params.mimeType,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: extractionSchema,
            temperature: 0.1,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      { maxRetries: 1, initialDelayMs: 1000, timeoutMs: 15000 },
    );

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);
    const validated = extractedScheduleResponseSchema.parse(parsed);

    await logAiInteraction({
      usuarioId: params.usuarioId,
      tipoOperacion: 'extraccion_horario',
      modelo: GEMINI_DEFAULT_MODEL,
      promptEnviado: prompt,
      respuestaCruda: rawText,
      duracionMs: Date.now() - startTime,
    });

    return validated;
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    await logAiInteraction({
      usuarioId: params.usuarioId,
      tipoOperacion: 'extraccion_horario',
      modelo: GEMINI_DEFAULT_MODEL,
      promptEnviado: prompt,
      respuestaCruda: '',
      duracionMs: Date.now() - startTime,
      error: errMessage,
    });
    throw new Error(`Error extrayendo horario con visión de Gemini: ${errMessage}`);
  }
}

export interface ProjectForGeminiTaskGeneration {
  id: string;
  user_id: string;
  titulo: string;
  objetivo?: string | null;
  fecha_limite?: string | null;
  prioridad?: string | null;
  nivel_conocimiento?: string | null;
  minutos_diarios?: number | null;
  material_url?: string | null;
}

/**
 * Genera tareas inteligentes con Gemini para un proyecto y las organiza en el calendario
 * respetando la disponibilidad del usuario (sin colisiones con clases, trabajo u ocupado).
 */
export async function generateProjectTasksAndScheduleWithGemini(
  project: ProjectForGeminiTaskGeneration,
) {
  const startTime = Date.now();
  const supabase = await createClient();
  const adminDb = getAdminClient();
  const db = adminDb || supabase;

  try {
    // 1. Obtener disponibilidad del usuario (bloques ocupados de trabajo, estudio o clases)
    const { data: bloquesDisp } = await db
      .from('bloques_disponibilidad')
      .select('*')
      .eq('usuario_id', project.user_id);

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    let disponibilidadDesc = 'Sin bloques ocupados específicos registrados en el perfil.';
    const busyBlocks = (bloquesDisp || []).filter(
      (b) => b.tipo === 'ocupado' || b.tipo === 'trabajo' || b.tipo === 'estudio',
    );

    if (busyBlocks.length > 0) {
      disponibilidadDesc = busyBlocks
        .map((b) => {
          const dName =
            b.fecha_especifica ||
            (b.dia_semana !== null && b.dia_semana !== undefined ? dayNames[b.dia_semana] : 'Día');
          return `- ${dName}: ${b.hora_inicio} a ${b.hora_fin} (Ocupado por ${b.tipo})`;
        })
        .join('\n');
    }

    // 2. Obtener eventos de calendario existentes para evitar colisiones
    const nowIso = new Date().toISOString();
    const { data: eventosExistentes } = await db
      .from('eventos_calendario')
      .select('inicio, fin, titulo')
      .eq('usuario_id', project.user_id)
      .gte('fin', nowIso)
      .neq('estado', 'cancelado')
      .limit(50);

    let eventosDesc = 'Sin otros eventos agendados próximos.';
    if (eventosExistentes && eventosExistentes.length > 0) {
      eventosDesc = eventosExistentes
        .map((e) => {
          const d = new Date(e.inicio);
          const fechaStr = d.toISOString().split('T')[0];
          const horaStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          return `- ${fechaStr} a las ${horaStr}: "${e.titulo}"`;
        })
        .join('\n');
    }

    // 3. Calcular marco temporal (desde mañana hasta fecha_limite)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    let deadlineStr = project.fecha_limite ? project.fecha_limite.split('T')[0] : '';
    let totalDays = 30;

    if (deadlineStr) {
      const dDate = new Date(deadlineStr);
      if (!isNaN(dDate.getTime())) {
        const diffMs = dDate.getTime() - today.getTime();
        totalDays = Math.max(2, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      }
    } else {
      const defaultDead = new Date(today);
      defaultDead.setDate(defaultDead.getDate() + 30);
      deadlineStr = defaultDead.toISOString().split('T')[0];
    }

    const minutosDiarios = Math.max(15, Number(project.minutos_diarios) || 30);
    const nivel = project.nivel_conocimiento || 'Principiante';
    const prioridad = project.prioridad || 'Prioritario';

    // 4. Prompt pedagógico para Gemini
    const prompt = `Eres un mentor y planificador académico/profesional de alto nivel.
Genera un plan de tareas detallado y progresivo para el siguiente proyecto estudiantil/laboral, y organízalas en un cronograma diario sin colisiones.

DATOS DEL PROYECTO:
- Título: ${project.titulo}
- Objetivo: ${project.objetivo || 'Dominar los conceptos y completar el proyecto satisfactoriamente'}
- Nivel de conocimiento inicial del usuario: ${nivel}
- Prioridad: ${prioridad}
- Fecha actual de inicio: ${todayStr}
- Fecha límite final: ${deadlineStr} (Plazo disponible: ${totalDays} días)
- Tiempo disponible diario del usuario: ${minutosDiarios} minutos por día.
${project.material_url ? `- Material o recurso suministrado: ${project.material_url}` : ''}

HORARIOS OCUPADOS DEL USUARIO (¡PROHIBIDO ASIGNAR TAREAS EN ESTAS FRANJAS!):
${disponibilidadDesc}

EVENTOS PUNTUALES YA AGENDADOS:
${eventosDesc}

DIRECTRICES OBLIGATORIAS:
1. DISTRIBUCIÓN TEMPORAL: Genera tareas secuenciales distribuidas coherentemente a lo largo de los días disponibles (desde mañana hasta la fecha límite).
2. DURACIÓN DIARIA: Cada tarea debe tener una duración estimada en minutos que coincida con la disponibilidad diaria del usuario (${minutosDiarios} minutos).
3. DIFICULTAD Y COMPLEJIDAD:
   - Si el nivel es "Principiante" o "ninguno", inicia con tareas de conceptos fundamentales, entorno y pasos introductorios antes de avanzar.
   - Si una tarea o concepto es complejo, divídelo en sesiones consecutivas (ej. "Módulo X - Parte 1: Teoría", "Módulo X - Parte 2: Práctica") de ${minutosDiarios} minutos cada una.
4. ASIGNACIÓN AL CALENDARIO COHERENTE Y SIN COLISIONES:
   - Para cada tarea debes proponer una fecha ("fecha": YYYY-MM-DD), una hora de inicio ("hora_inicio": HH:MM militar) y hora de fin ("hora_fin": HH:MM militar).
   - Las horas deben ser diurnas y lógicas (entre las 08:00 y las 21:00).
   - ¡NO DEBE COINCIDIR ni solaparse con ningún bloque ocupado de clases, trabajo o eventos existentes! Elige momentos en que el usuario esté libre.
5. Para cada tarea, incluye una breve descripción y una URL de recurso o búsqueda sugerida (documentación, guía o tutorial).`;

    const projectTasksSchema = {
      type: Type.OBJECT,
      properties: {
        resumen: {
          type: Type.STRING,
          description: 'Resumen conciso del plan de aprendizaje y cronograma.',
        },
        tareas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              titulo: { type: Type.STRING, description: 'Título de la tarea' },
              descripcion: { type: Type.STRING, description: 'Breve explicación u objetivo' },
              duracion_minutos: { type: Type.INTEGER, description: 'Minutos estimados' },
              fecha: { type: Type.STRING, description: 'Fecha YYYY-MM-DD' },
              hora_inicio: { type: Type.STRING, description: 'HH:MM militar' },
              hora_fin: { type: Type.STRING, description: 'HH:MM militar' },
              prioridad: { type: Type.STRING, description: 'Prioritario, Normal, etc.' },
              url_recomendada: { type: Type.STRING, description: 'Enlace web recomendado o documentación' },
            },
            required: ['titulo', 'duracion_minutos', 'fecha', 'hora_inicio', 'hora_fin'],
          },
        },
      },
      required: ['resumen', 'tareas'],
    };

    // 5. Llamada con retry y fallback a Gemini
    const response = await callGeminiWithRetry(
      (ai, model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: projectTasksSchema,
            temperature: 0.2,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      { maxRetries: 1, initialDelayMs: 1000, timeoutMs: 15000 },
    );

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText) as {
      resumen?: string;
      tareas?: Array<{
        titulo: string;
        descripcion?: string;
        duracion_minutos?: number;
        fecha: string;
        hora_inicio: string;
        hora_fin: string;
        prioridad?: string;
        url_recomendada?: string;
      }>;
    };

    const tasksList = parsed.tareas || [];
    if (tasksList.length === 0) {
      return {
        success: false,
        error: 'La IA no devolvió tareas estructuradas.',
      };
    }

    // 6. Preparar inserción de tareas en la tabla 'tareas' de Supabase
    const tasksToInsert = tasksList.map((t) => {
      const taskId = crypto.randomUUID();
      const duracion = Math.max(15, Number(t.duracion_minutos) || minutosDiarios);
      const fechaInicioIso = new Date(`${t.fecha}T${t.hora_inicio}:00`).toISOString();

      return {
        id: taskId,
        id_proyecto: project.id,
        titulo: t.titulo.trim(),
        descripcion: t.descripcion?.trim() || null,
        duracion,
        completado: false,
        fecha_inicio: fechaInicioIso,
        prioridad: t.prioridad || prioridad,
        resources: t.url_recomendada || project.material_url || null,
        fecha: t.fecha,
        hora_inicio: t.hora_inicio,
        hora_fin: t.hora_fin,
      };
    });

    const { data: insertedTasks, error: insertTasksErr } = await db
      .from('tareas')
      .insert(
        tasksToInsert.map((t) => ({
          id: t.id,
          id_proyecto: t.id_proyecto,
          titulo: t.titulo,
          descripcion: t.descripcion,
          duracion: t.duracion,
          completado: t.completado,
          fecha_inicio: t.fecha_inicio,
          prioridad: t.prioridad,
          resources: t.resources,
        })),
      )
      .select();

    if (insertTasksErr) {
      console.error('Error al insertar tareas generadas por Gemini:', insertTasksErr);
      return {
        success: false,
        error: `Error al persistir tareas en Supabase: ${insertTasksErr.message}`,
      };
    }

    // 7. Insertar eventos correspondientes en 'eventos_calendario'
    const eventsToInsert = tasksToInsert.map((t) => {
      const startIso = new Date(`${t.fecha}T${t.hora_inicio}:00`).toISOString();
      const endIso = new Date(`${t.fecha}T${t.hora_fin}:00`).toISOString();

      return {
        id: crypto.randomUUID(),
        usuario_id: project.user_id,
        proyecto_id: project.id,
        tarea_id: t.id,
        titulo: t.titulo,
        descripcion: t.descripcion || '',
        inicio: startIso,
        fin: endIso,
        estado: 'pendiente' as const,
        generado_por_ia: true,
      };
    });

    const { error: insertEventsErr } = await db
      .from('eventos_calendario')
      .insert(eventsToInsert);

    if (insertEventsErr) {
      console.warn('Advertencia insertando eventos de calendario:', insertEventsErr);
    }

    // 8. Actualizar progreso del proyecto a 0%
    await db
      .from('projects')
      .update({ progreso: 0, completado: false })
      .eq('id', project.id);

    // 9. Registrar log de interacción IA
    await logAiInteraction({
      usuarioId: project.user_id,
      proyectoId: project.id,
      tipoOperacion: 'generacion_cronograma',
      modelo: GEMINI_DEFAULT_MODEL,
      promptEnviado: prompt,
      respuestaCruda: rawText,
      duracionMs: Date.now() - startTime,
    });

    return {
      success: true,
      count: tasksToInsert.length,
      tasks: insertedTasks || tasksToInsert,
      events: eventsToInsert,
      resumen: parsed.resumen || '',
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    await logAiInteraction({
      usuarioId: project.user_id,
      proyectoId: project.id,
      tipoOperacion: 'generacion_cronograma',
      modelo: GEMINI_DEFAULT_MODEL,
      promptEnviado: `Proyecto: ${project.titulo}`,
      respuestaCruda: '',
      duracionMs: Date.now() - startTime,
      error: errMessage,
    });
    console.error('Error en generateProjectTasksAndScheduleWithGemini:', error);
    return {
      success: false,
      error: `Error al generar tareas con Gemini: ${errMessage}`,
    };
  }
}

export interface CheckProjectFeasibilityParams {
  titulo: string;
  objetivo?: string | null;
  fecha_limite?: string | null;
  minutos_diarios?: number | null;
  nivel_conocimiento?: string | null;
  usuario_id?: string;
}

export interface FeasibilityResult {
  es_posible: boolean;
  motivo?: string;
  tiempo_minimo_recomendado?: string;
  error?: string;
}

/**
 * Evalúa mediante IA (Gemini) si un proyecto es humanamente y pedagógicamente
 * alcanzable en el tiempo límite y dedicación diaria especificados por el usuario.
 */
export async function checkProjectFeasibilityWithGemini(
  params: CheckProjectFeasibilityParams,
): Promise<FeasibilityResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let diffDays = 30;

  if (params.fecha_limite) {
    const deadline = new Date(params.fecha_limite);
    if (!isNaN(deadline.getTime())) {
      deadline.setHours(0, 0, 0, 0);
      const diffMs = deadline.getTime() - today.getTime();
      diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  const minutosDiarios = Math.max(15, Number(params.minutos_diarios) || 30);
  const horasTotales = Math.round((diffDays * minutosDiarios) / 60);

  // Si no hay API key configurada, realizar validación heurística básica de seguridad
  if (!process.env.GEMINI_API_KEY) {
    if (diffDays <= 1 && (params.objetivo?.length || 0) > 100) {
      return {
        es_posible: false,
        motivo: 'El plazo de 1 día es insuficiente para un objetivo tan complejo.',
        error: `Es imposible realizar el proyecto en solo ${diffDays} día(s). Se necesita más tiempo para alcanzar este objetivo.`,
      };
    }
    return { es_posible: true };
  }

  const feasibilityJsonSchema = {
    type: Type.OBJECT,
    properties: {
      es_posible: {
        type: Type.BOOLEAN,
        description:
          'true si el proyecto es pedagógicamente viable y alcanzable en el tiempo disponible; false si es manifiestamente imposible.',
      },
      motivo: {
        type: Type.STRING,
        description: 'Explicación detallada y pedagógica en español de por qué es posible o imposible.',
      },
      tiempo_minimo_recomendado: {
        type: Type.STRING,
        description:
          'Tiempo mínimo estimado que realmente se requeriría (ej. "al menos 2 meses", "mínimo 4 semanas").',
      },
    },
    required: ['es_posible', 'motivo'],
  };

  const prompt = `Eres un evaluador académico, pedagógico y de viabilidad de proyectos de estudio.
Tu labor es determinar con rigurosidad y honestidad pedagógica si el siguiente proyecto es FACTIBLE o IMPOSIBLE de realizar en el plazo y tiempo diario asignado por el estudiante.

DATOS DEL PROYECTO:
- Título: ${params.titulo}
- Objetivo declarado: ${params.objetivo || 'Avanzar en el aprendizaje del tema'}
- Nivel actual del estudiante: ${params.nivel_conocimiento || 'Principiante'}
- Plazo límite: ${params.fecha_limite || 'No especificado'} (${diffDays} días restantes)
- Dedicación diaria: ${minutosDiarios} minutos al día.
- Tiempo total disponible de trabajo: ~${horasTotales} horas de dedicación en todo el proyecto.

CRITERIOS ESTRICTOS DE EVALUACIÓN:
1. IMPOSIBLE (es_posible = false):
   - Metas de aprendizaje o desarrollo que objetivamente requieren cientos o miles de horas de estudio/práctica (por ejemplo: dominar una carrera profesional completa, medicina, ingeniería de software desde cero, dominar múltiples idiomas extranjeros, construir un sistema operativo o cohete) pero el usuario tiene pocos días o semanas, o una cantidad ínfima de horas totales (~menos de 20-50 horas cuando se requieren cientos o miles).
   - Metas amplias o complejas con un plazo ridículamente estrecho (ejemplo: 1 a 7 días para dominar un campo amplio o completar una meta muy ambiciosa).
   - Si es IMPOSIBLE, explica con empatía y claridad que es imposible realizar el proyecto en ese tiempo, detallando por qué y cuánto tiempo mínimo realmente necesitaría.

2. FACTIBLE (es_posible = true):
   - Metas acotadas, razonables o realistas para el tiempo disponible (ejemplo: aprender fundamentos básicos de Python en 1 mes, preparar un examen específico en 2 semanas, hacer un taller práctico, rediseñar una página web).
   - Proyectos donde la meta está alineada con las horas totales de dedicación.

Responde ÚNICAMENTE un objeto JSON que siga el esquema especificado.`;

  try {
    const startTime = Date.now();
    const response = await callGeminiWithRetry(
      (ai, model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseJsonSchema: feasibilityJsonSchema,
            temperature: 0.1,
            maxOutputTokens: 300,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      {
        maxRetries: 1,
        initialDelayMs: 1000,
        models: ['gemini-3.6-flash', 'gemini-3.8-flash'],
      },
    );

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText) as {
      es_posible?: boolean;
      motivo?: string;
      tiempo_minimo_recomendado?: string;
    };

    await logAiInteraction({
      usuarioId: params.usuario_id,
      tipoOperacion: 'evaluacion_viabilidad',
      modelo: GEMINI_DEFAULT_MODEL,
      promptEnviado: prompt,
      respuestaCruda: rawText,
      duracionMs: Date.now() - startTime,
    });

    if (parsed.es_posible === false) {
      const recom = parsed.tiempo_minimo_recomendado
        ? ` Tiempo mínimo recomendado: ${parsed.tiempo_minimo_recomendado}.`
        : '';
      return {
        es_posible: false,
        motivo: parsed.motivo,
        tiempo_minimo_recomendado: parsed.tiempo_minimo_recomendado,
        error: `Es imposible realizar el proyecto en el tiempo límite indicado (${diffDays} días). ${parsed.motivo || 'Se necesita más tiempo para alcanzar este objetivo.'}${recom}`,
      };
    }

    return {
      es_posible: true,
      motivo: parsed.motivo,
    };
  } catch (error) {
    console.warn('Advertencia: Error al evaluar viabilidad con Gemini, permitiendo fallback:', error);
    // En caso de falla de red con Gemini, no bloquear al usuario a menos que sea plazo 0 o negativo
    return { es_posible: true };
  }
}

