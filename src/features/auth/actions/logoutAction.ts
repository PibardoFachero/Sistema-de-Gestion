'use server';

import { createClient } from '@/lib/supabase/server';

export async function logoutUser() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Error cerrando sesión en el servidor:', error);
  }
  return { success: true };
}

