import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_DEFAULT_MODEL } from '@/lib/gemini/geminiClient';
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
  const ai = getGeminiClient();
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
    const response = await ai.models.generateContent({
      model: GEMINI_DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: scheduleJsonSchema,
        temperature: 0.3,
      },
    });

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
  const ai = getGeminiClient();
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
    const response = await ai.models.generateContent({
      model: GEMINI_DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: scheduleJsonSchema,
        temperature: 0.3,
      },
    });

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
 */
export async function extractScheduleFromImageWithGemini(params: {
  base64Data: string;
  mimeType: string;
  usuarioId?: string;
}): Promise<ExtractedScheduleResponse> {
  const ai = getGeminiClient();
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
    const response = await ai.models.generateContent({
      model: GEMINI_DEFAULT_MODEL,
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
      },
    });

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
