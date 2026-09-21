import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * getAdminClient
 * Retorna un cliente de Supabase con permisos de servicio (Service Role)
 * si la variable SUPABASE_SERVICE_ROLE_KEY está configurada en .env.local.
 * Permite realizar operaciones administrativas en el servidor omitiendo RLS.
 */
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey || serviceKey.trim() === '') {
    return null;
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
