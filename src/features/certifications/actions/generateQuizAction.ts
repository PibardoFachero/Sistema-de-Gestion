'use server';

import { createClient } from '@/lib/supabase/server';
import { getGeminiClient, GEMINI_DEFAULT_MODEL } from '@/lib/gemini/geminiClient';
import { z } from 'zod';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface GenerateQuizInput {
  taskId: string;
}

export interface GenerateQuizResponse {
  success: boolean;
  questions?: QuizQuestion[];
  error?: string;
}

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctAnswerIndex: z.number().min(0).max(3),
    })
  ).length(10),
});

export async function generateQuizAction(
  input: GenerateQuizInput
): Promise<GenerateQuizResponse> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const taskContext = `Título: ${task.titulo}\nDescripción: ${task.descripcion || 'Sin descripción'}`;

    const prompt = `
      Actúa como un profesor y experto riguroso en la materia. Eres el encargado de evaluar el conocimiento profundo adquirido por un estudiante sobre un tema muy específico.
      El estudiante ha estado estudiando el siguiente tema/tarea:
      
      ${taskContext}
      
      Por favor, genera un cuestionario de opción múltiple con EXACTAMENTE 10 PREGUNTAS basadas y estrictamente relacionadas con el tema central de esta tarea.
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

    const gemini = getGeminiClient();
    const response = await gemini.models.generateContent({
      model: GEMINI_DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  question: { type: "STRING" },
                  options: {
                    type: "ARRAY",
                    items: { type: "STRING" },
                  },
                  correctAnswerIndex: { type: "INTEGER" },
                },
                required: ["question", "options", "correctAnswerIndex"],
              },
            },
          },
          required: ["questions"],
        },
      },
    });

    const text = response.text();
    if (!text) {
      return { success: false, error: 'El modelo no devolvió una respuesta válida.' };
    }

    const parsedData = JSON.parse(text);
    const validatedData = quizSchema.parse(parsedData);

    return {
      success: true,
      questions: validatedData.questions,
    };
  } catch (error) {
    console.error('Error in generateQuizAction:', error);
    return { success: false, error: 'Hubo un error al generar el cuestionario con IA.' };
  }
}

export async function markTaskQuizPassedAction(taskId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autorizado.' };
    }

    const { error } = await supabase
      .from('tareas')
      .update({ quiz_aprobado: true })
      .eq('id', taskId);

    if (error) {
      return { success: false, error: 'No se pudo actualizar el estado de la tarea en la base de datos.' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking quiz as passed:', error);
    return { success: false, error: 'Error interno del servidor.' };
  }
}
