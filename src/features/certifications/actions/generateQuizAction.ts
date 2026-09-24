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
  projectId: string;
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
  ).length(5),
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

    // Obtener las tareas del proyecto
    const { data: tasks, error: tasksError } = await supabase
      .from('tareas')
      .select('titulo, descripcion, completado')
      .eq('project_id', input.projectId)
      .eq('completado', true);

    if (tasksError) {
      return { success: false, error: 'Error al obtener las tareas del proyecto.' };
    }

    if (!tasks || tasks.length === 0) {
      return { success: false, error: 'El proyecto no tiene tareas completadas para evaluar.' };
    }

    const taskContext = tasks.map(t => `- ${t.titulo}: ${t.descripcion || 'Sin descripción'}`).join('\n');

    const prompt = `
      Actúa como un profesor experto. Eres el encargado de evaluar el conocimiento adquirido por un estudiante.
      El estudiante acaba de finalizar un proyecto autodidacta con las siguientes tareas completadas:
      
      ${taskContext}
      
      Por favor, genera un cuestionario de opción múltiple con exactamente 5 preguntas basadas en este contenido.
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
