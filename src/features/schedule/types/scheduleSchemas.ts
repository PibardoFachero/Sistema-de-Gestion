import { z } from 'zod';

// Esquema de cada hito del cronograma
export const scheduleMilestoneSchema = z.object({
  titulo: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD'),
});

// Esquema de cada bloque temporal de trabajo
export const scheduleBlockSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha debe ser YYYY-MM-DD'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora debe ser HH:MM'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora debe ser HH:MM'),
  tarea: z.string().min(1),
  descripcion: z.string().default(''),
  proyecto_id: z.string().optional(),
});

// Esquema completo del JSON devuelto por Gemini
export const generatedScheduleSchema = z.object({
  resumen: z.string(),
  hitos: z.array(scheduleMilestoneSchema),
  bloques: z.array(scheduleBlockSchema),
});

export type ScheduleMilestone = z.infer<typeof scheduleMilestoneSchema>;
export type ScheduleBlock = z.infer<typeof scheduleBlockSchema>;
export type GeneratedSchedule = z.infer<typeof generatedScheduleSchema>;

// Esquema para la extracción de bloques de horarios desde imágenes o documentos
export const extractedScheduleBlockSchema = z.object({
  dia_semana: z.number().int().min(0).max(6), // 0: Domingo, 1: Lunes, ... 6: Sábado
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/),
  tipo: z.enum(['ocupado', 'libre', 'estudio', 'trabajo', 'otra_actividad']),
  etiqueta: z.string().default(''),
});

export const extractedScheduleResponseSchema = z.object({
  bloques: z.array(extractedScheduleBlockSchema),
  observaciones: z.string().optional(),
});

export type ExtractedScheduleBlock = z.infer<typeof extractedScheduleBlockSchema>;
export type ExtractedScheduleResponse = z.infer<typeof extractedScheduleResponseSchema>;

// Esquema del payload recibido por el endpoint POST /api/projects/:id/generate-schedule
export const generateScheduleRequestSchema = z.object({
  nombre_proyecto: z.string().optional(),
  objetivo_final: z.string().optional(),
  fecha_limite: z.string().optional(),
  importancia: z.enum(['obligatorio', 'prioritario', 'hobby', 'Obligatorio', 'Prioritario', 'Hobby']).optional(),
  nivel_conocimiento: z.enum(['ninguno', 'basico', 'intermedio', 'avanzado', 'Principiante', 'Intermedio', 'Avanzado']).optional(),
  archivos_adjuntos: z
    .array(
      z.object({
        nombre: z.string(),
        tipo: z.string(),
        contenidoBase64: z.string().optional(),
        textoExtraido: z.string().optional(),
      }),
    )
    .max(3)
    .optional(),
  enlaces: z.array(z.string()).optional(),
  tiempo_diario_disponible: z.union([z.string(), z.number()]).optional(),
});

export type GenerateScheduleRequest = z.infer<typeof generateScheduleRequestSchema>;

// Esquema para la actualización de disponibilidad en PATCH /api/users/:id/availability
export const availabilityChangeItemSchema = z.object({
  dia_semana: z.number().int().min(0).max(6).optional().nullable(),
  fecha_especifica: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/),
  tipo: z.enum(['ocupado', 'libre', 'estudio', 'trabajo', 'otra_actividad']),
  origen: z.enum(['manual', 'extraido_ia', 'google_calendar']).default('manual'),
  accion: z.enum(['agregar', 'eliminar']).default('agregar'),
});

export const updateAvailabilityRequestSchema = z.object({
  cambios: z.array(availabilityChangeItemSchema).min(1),
  fecha_limite_proyecto: z.string().optional(),
  proyecto_id: z.string().uuid().optional(),
  forzar_regeneracion: z.boolean().optional(),
});

export type UpdateAvailabilityRequest = z.infer<typeof updateAvailabilityRequestSchema>;
