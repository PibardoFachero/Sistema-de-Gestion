'use server';

import { createClient } from '@/lib/supabase/server';

export async function savePersonalContext(context: string) {
  const normalizedContext = context.trim();

  if (normalizedContext.length > 1000) {
    return { success: false, error: 'El contexto personal debe tener como máximo 1000 caracteres.' };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'No se encontró una sesión activa.' };

  const { error } = await supabase
    .from('profiles')
    .update({ contexto_personal: normalizedContext || null })
    .eq('id', user.id);

  if (error) return { success: false, error: `No fue posible guardar el contexto: ${error.message}` };
  return { success: true };
}
