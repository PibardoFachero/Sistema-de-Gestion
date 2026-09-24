'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getGeminiClient,
  GEMINI_DEFAULT_MODEL,
  GEMINI_FALLBACK_MODEL,
  GEMINI_LITE_MODEL,
  markActiveKeyExhaustedAndRotate,
  getGeminiKeyCount,
} from '@/lib/gemini/geminiClient';
import { z } from 'zod';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface GenerateQuizInput {
  taskId: string;
  forceFallback?: boolean;
}

export interface GenerateQuizResponse {
  success: boolean;
  questions?: QuizQuestion[];
  error?: string;
  isFallback?: boolean;
}

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        correctAnswerIndex: z.number().min(0).max(3),
      }),
    )
    .length(4),
});

/**
 * Generador de evaluación de contingencia académica.
 * Se activa automáticamente si la IA de Google Gemini experimenta saturación (503),
 * límites de cuota (429) o fallos de red, garantizando que el estudiante nunca quede bloqueado
 * para validar sus conocimientos y obtener su certificado.
 */
function generateFallbackQuiz(taskTitle: string, taskDescription?: string): QuizQuestion[] {
  const cleanTitle = taskTitle.trim() || 'Estudio del tema';
  const cleanDesc = (taskDescription || '').trim();
  const descSnippet = cleanDesc.length > 10 ? cleanDesc.slice(0, 110) : '';

  const rawQuestions = [
    {
      question: `¿Cuál es el objetivo principal y propósito formativo al trabajar en "${cleanTitle}"?`,
      options: [
        `Comprender los conceptos clave y aplicar de manera metódica los fundamentos de ${cleanTitle}.`,
        `Completar la tarea rápidamente omitiendo la revisión de conceptos teóricos.`,
        `Memorizar definiciones superficiales sin comprobar su aplicación práctica.`,
        `Reemplazar la planificación estructurada por modificaciones no documentadas.`,
      ],
      correctAnswerIndex: 0,
    },
    {
      question: descSnippet
        ? `Considerando el alcance "${descSnippet}...", ¿cuál es la mejor estrategia para validar su cumplimiento?`
        : `Para asegurar un resultado riguroso y de alta calidad en "${cleanTitle}", ¿qué enfoque es el más recomendable?`,
      options: [
        `Descomponer los requisitos en etapas verificables y contrastar los resultados con los criterios de éxito.`,
        `Finalizar sin contrastar los entregables contra los objetivos planteados.`,
        `Ignorar los estándares y metodologías recomendadas para la materia.`,
        `Asumir que el resultado es correcto sin realizar pruebas ni comprobaciones.`,
      ],
      correctAnswerIndex: 0,
    },
    {
      question: `Durante la resolución de problemas o desafíos técnicos en "${cleanTitle}", ¿cuál es la conducta más rigurosa?`,
      options: [
        `Identificar la causa raíz mediante observación analítica, documentación y pruebas controladas.`,
        `Aplicar cambios al azar hasta que el error deje de ser visible superficialmente.`,
        `Reiniciar todo el trabajo desde cero ante la primera dificultad encontrada.`,
        `Ignorar las advertencias y errores menores para agilizar la entrega.`,
      ],
      correctAnswerIndex: 0,
    },
    {
      question: `¿Qué evidencia confirma que has adquirido un dominio efectivo sobre "${cleanTitle}"?`,
      options: [
        `Capacidad para explicar los conceptos con criterio técnico y aplicarlos a nuevos escenarios del proyecto.`,
        `Recordar términos de memoria sin comprender su funcionamiento ni su utilidad real.`,
        `Haber concluido el tiempo asignado sin haber completado los entregables definidos.`,
        `Delegar la justificación técnica en herramientas externas sin entender los fundamentos.`,
      ],
      correctAnswerIndex: 0,
    },
  ];

  // Aleatorizar el orden de las opciones para cada pregunta
  return rawQuestions.map((q) => {
    const correctText = q.options[q.correctAnswerIndex];
    const shuffled = [...q.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return {
      question: q.question,
      options: shuffled,
      correctAnswerIndex: shuffled.indexOf(correctText),
    };
  });
}

export async function generateQuizAction(input: GenerateQuizInput): Promise<GenerateQuizResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado.' };
    }

    // Obtener la tarea específica
    const { data: task, error: taskError } = await supabase
      .from('tareas')
      .select('titulo, descripcion, completado')
      .eq('id', input.taskId)
      .single();

    if (taskError || !task) {
      return { success: false, error: 'Error al obtener la tarea o no existe.' };
    }

    // Si el usuario solicitó directamente la evaluación de contingencia
    if (input.forceFallback) {
      return {
        success: true,
        questions: generateFallbackQuiz(task.titulo, task.descripcion),
        isFallback: true,
      };
    }

    const taskContext = `Título: ${task.titulo}\nDescripción: ${task.descripcion || 'Sin descripción'}`;

    const prompt = `
      Actúa como un profesor y experto riguroso en la materia. Eres el encargado de evaluar el conocimiento profundo adquirido por un estudiante sobre un tema muy específico.
      El estudiante ha estado estudiando el siguiente tema/tarea:
      
      ${taskContext}
      
      Por favor, genera un cuestionario de opción múltiple con EXACTAMENTE 4 PREGUNTAS basadas y estrictamente relacionadas con el tema central de esta tarea.
      Las preguntas deben evaluar la comprensión real, conceptos teóricos y posibles aplicaciones prácticas de este tema. No hagas preguntas triviales.
      Cada pregunta debe tener 4 opciones, y solo una de ellas debe ser la correcta.
      Devuelve la respuesta en formato JSON estrictamente siguiendo esta estructura:
      {
        "questions": [
          {
            "question": "texto de la pregunta",
            "options": ["opcion 1", "opcion 2", "opcion 3", "opcion 4"],
            "correctAnswerIndex": 0 // Indice de 0 a 3 de la respuesta correcta
          }
        ]
      }
    `;

    // Cascada de modelos compatibles con fallback gradual
    const modelsCascade = [GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL, GEMINI_LITE_MODEL];

    let lastError: unknown = null;
    let validatedQuestions: QuizQuestion[] | null = null;

    // Intentar con la cascada de modelos y rotación de claves
    for (const model of modelsCascade) {
      let attemptsForModel = 0;
      const maxAttempts = Math.max(2, getGeminiKeyCount());

      while (attemptsForModel < maxAttempts) {
        try {
          const gemini = getGeminiClient();
          const response = await gemini.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  questions: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        question: { type: 'STRING' },
                        options: {
                          type: 'ARRAY',
                          items: { type: 'STRING' },
                        },
                        correctAnswerIndex: { type: 'INTEGER' },
                      },
                      required: ['question', 'options', 'correctAnswerIndex'],
                    },
                  },
                },
                required: ['questions'],
              },
            },
          });

          const text = response.text;
          if (text) {
            const parsedData = JSON.parse(text);
            const validatedData = quizSchema.parse(parsedData);
            validatedQuestions = validatedData.questions;
            break;
          }
        } catch (err: unknown) {
          lastError = err;
          const geminiErr = err as {
            status?: number;
            response?: { status?: number };
            message?: string;
          };
          const status = geminiErr?.status || geminiErr?.response?.status;
          const msg = geminiErr?.message || '';

          console.warn(
            `[generateQuizAction] Fallo con modelo ${model} (intento ${attemptsForModel + 1}):`,
            msg,
          );

          // Si el servidor de Google está saturado (503) o superamos cuota (429), rotar clave
          if (status === 429 || status === 503 || msg.includes('429') || msg.includes('503')) {
            markActiveKeyExhaustedAndRotate(5000);
            attemptsForModel++;
          } else {
            // Error no transitorio con este modelo, pasar al siguiente modelo
            break;
          }
        }
      }

      if (validatedQuestions) {
        break;
      }
    }

    if (validatedQuestions) {
      return {
        success: true,
        questions: validatedQuestions,
        isFallback: false,
      };
    }

    // Si todos los modelos de IA de Google y claves fallaron (por saturación 503 o cuota 429):
    // Activar automáticamente el generador de evaluación de contingencia académica
    console.info(
      '[generateQuizAction] Modelos de IA no disponibles temporalmente. Activando evaluación de contingencia académica para la tarea:',
      task.titulo,
      lastError,
    );

    const fallbackQuestions = generateFallbackQuiz(task.titulo, task.descripcion);

    return {
      success: true,
      questions: fallbackQuestions,
      isFallback: true,
    };
  } catch (error) {
    console.error('Error in generateQuizAction:', error);
    return {
      success: false,
      error: 'Hubo un error inesperado al generar el cuestionario.',
    };
  }
}

export async function markTaskQuizPassedAction(taskId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado.' };
    }

    const { error } = await supabase
      .from('tareas')
      .update({ quiz_aprobado: true })
      .eq('id', taskId);

    if (error) {
      return {
        success: false,
        error: 'No se pudo actualizar el estado de la tarea en la base de datos.',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking quiz as passed:', error);
    return { success: false, error: 'Error interno del servidor.' };
  }
}
