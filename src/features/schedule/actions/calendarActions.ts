'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface CalendarEventItem {
  id: string;
  usuario_id: string;
  proyecto_id?: string | null;
  tarea_id?: string | null;
  titulo: string;
  descripcion?: string | null;
  inicio: string;
  fin: string;
  estado: string;
  generado_por_ia: boolean;
}

export interface AvailabilityBlockItem {
  id: string;
  usuario_id: string;
  dia_semana: number | null;
  fecha_especifica?: string | null;
  hora_inicio: string;
  hora_fin: string;
  tipo: 'ocupado' | 'tareas' | 'estudio' | 'trabajo' | 'otra_actividad';
  origen: string;
}

/**
 * Carga todos los eventos de calendario y bloques de disponibilidad del usuario autenticado.
 */
export async function getCalendarDataAction() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado', events: [], availabilities: [] };
    }

    const adminDb = getAdminClient();
    const db = adminDb || supabase;

    // Consultar eventos de calendario (tareas programadas por IA o usuario)
    const { data: events, error: eventsErr } = await db
      .from('eventos_calendario')
      .select('*')
      .eq('usuario_id', user.id)
      .neq('estado', 'cancelado')
      .order('inicio', { ascending: true });

    if (eventsErr) {
      console.warn('Error al cargar eventos_calendario:', eventsErr);
    }

    // Consultar bloques de disponibilidad guardados en Supabase
    const { data: availabilities, error: availErr } = await db
      .from('bloques_disponibilidad')
      .select('*')
      .eq('usuario_id', user.id)
      .order('dia_semana', { ascending: true });

    if (availErr) {
      console.warn('Error al cargar bloques_disponibilidad:', availErr);
    }

    return {
      success: true,
      events: (events as CalendarEventItem[]) || [],
      availabilities: (availabilities as AvailabilityBlockItem[]) || [],
    };
  } catch (error) {
    console.error('Error en getCalendarDataAction:', error);
    return { success: false, error: 'Error al consultar calendario', events: [], availabilities: [] };
  }
}

/**
 * Elimina un evento o bloque específico del calendario en Supabase
 */
export async function deleteCalendarEventAction(eventId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const adminDb = getAdminClient();
    const db = adminDb || supabase;

    await db
      .from('eventos_calendario')
      .delete()
      .eq('id', eventId)
      .eq('usuario_id', user.id);

    revalidatePath('/calendario');
    return { success: true };
  } catch (error) {
    console.error('Error en deleteCalendarEventAction:', error);
    return { success: false, error: 'Error al eliminar evento' };
  }
}
