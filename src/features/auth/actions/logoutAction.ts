'use server';

import { createClient } from '@/lib/supabase/server';

export interface LogoutResponse {
  success: boolean;
  error?: string;
}

export async function logoutUser(): Promise<LogoutResponse> {
  try {
    const supabase = await createClient();

    // 1. Obtener usuario actual antes de revocar la sesión en el servidor
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // 2. Si el usuario está identificado, registrar fecha y hora en 'ultima_sesion'
    if (user && !authError) {
      const nowIso = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          ultima_sesion: nowIso,
          updated_at: nowIso,
        })
        .eq('id', user.id)
        .select('id');

      if (updateError) {
        console.error('Error al actualizar ultima_sesion en profiles:', updateError.message);
      } else if (!data || data.length === 0) {
        // Contingencia: si la fila de profiles no existía previamente, crearla con el timestamp
        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          nombre_usuario:
            user.user_metadata?.username ||
            user.user_metadata?.nombre_usuario ||
            user.email?.split('@')[0] ||
            'estudiante',
          fecha_registro: nowIso,
          ultima_sesion: nowIso,
          racha_activa: 0,
          racha_maxima: 0,
        });

        if (insertError) {
          console.error(
            'Error al insertar fila con ultima_sesion en profiles:',
            insertError.message,
          );
        }
      }
    }

    // 3. Cerrar sesión en Supabase Auth y purgar cookies
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('Error cerrando sesión en Supabase Auth:', signOutError.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Error cerrando sesión en el servidor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al cerrar sesión',
    };
  }
}
