import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingSurvey } from '@/features/onboarding/components/OnboardingSurvey';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Conoce a Mr. Chiwi | Komorebi Study Studio',
  description: 'Encuesta inicial de perfil para personalizar tus técnicas y planes de estudio.',
};

export default async function OnboardingPage() {
  const supabase = await createClient();

  // 1. Validar que el usuario esté autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Si ya completó la encuesta previamente, no mostrar onboarding y redirigir al panel
  if (user.user_metadata?.onboarding_completed) {
    redirect('/');
  }

  // Comprobar directamente en la tabla profiles por si los metadatos aún no se sincronizaron
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol_condicion')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.rol_condicion) {
    redirect('/');
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center py-6 sm:py-12 animate-in fade-in duration-500"
      style={{ background: 'linear-gradient(135deg, #FFF8F3 0%, #FBE6DD 50%, #F5E8E0 100%)' }}
    >
      <OnboardingSurvey />
    </main>
  );
}
