'use server';

import { createClient } from '@/lib/supabase/server';
import { validateContent } from '@/lib/moderation/contentFilter';

export async function savePersonalContext(context: string) {
  const normalizedContext = context.trim();

  if (normalizedContext.length > 1000) {
    return { success: false, error: 'La descripción debe tener como máximo 1000 caracteres.' };
  }

  if (normalizedContext) {
    const descValidation = validateContent(normalizedContext);
    if (!descValidation.isValid) {
      return {
        success: false,
        error: descValidation.error || 'La descripción contiene términos no permitidos.',
      };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'No se encontró una sesión activa.' };

  const { error } = await supabase
    .from('profiles')
    .update({
      descripcion: normalizedContext || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error)
    return { success: false, error: `No fue posible guardar la descripción: ${error.message}` };
  return { success: true };
}
