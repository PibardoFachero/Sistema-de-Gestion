import { z } from 'zod';

const supabaseEnvSchema = z.object({
  url: z.url(),
  anonKey: z.string().trim().min(1),
});

// Validate only when a client is requested: the scaffold works without credentials.
// Keep explicit NEXT_PUBLIC accesses so Next.js can inline browser configuration.
export function getSupabaseEnv() {
  const result = supabaseEnvSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!result.success) {
    throw new Error(
      'Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local antes de usar Supabase.',
    );
  }

  return result.data;
}
