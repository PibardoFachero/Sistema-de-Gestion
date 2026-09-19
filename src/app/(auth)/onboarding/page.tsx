import { Metadata } from 'next';
import { OnboardingSurvey } from '@/features/onboarding/components/OnboardingSurvey';

export const metadata: Metadata = {
  title: 'Conoce a Mr. Chiwi | Komorebi Study Studio',
  description: 'Encuesta inicial de perfil para personalizar tus técnicas y planes de estudio.',
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center py-6 sm:py-12 animate-in fade-in duration-500">
      <OnboardingSurvey />
    </main>
  );
}
