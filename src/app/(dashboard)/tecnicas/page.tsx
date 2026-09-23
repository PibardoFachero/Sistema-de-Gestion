import { Metadata } from 'next';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { STUDY_TECHNIQUES } from '@/features/study-methods/data/techniques';
import { StudyMethodCard } from '@/features/study-methods/components/StudyMethodCard';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Técnicas de Estudio | Komorebi',
  description: 'Selecciona la técnica de estudio que mejor se adapte a tu ritmo y objetivos.',
};

export default async function TecnicasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('metodologia')
    .eq('id', user.id)
    .single();

  const defaultMethodology = profile?.metodologia || '';

  return (
    <div className="relative min-h-full pb-20 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#2C1F14]">
          Técnicas de Estudio
        </h1>
        <p className="text-on-surface-variant max-w-2xl">
          Encuentra el ritmo perfecto para tu concentración. Explora nuestras técnicas,
          elige tu preferida como predeterminada o inicia una sesión directamente.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 max-w-3xl">
        {STUDY_TECHNIQUES.map((technique) => (
          <StudyMethodCard
            key={technique.id}
            technique={technique}
            isDefault={defaultMethodology === technique.name}
          />
        ))}
      </div>

      {/* Mascota fija en la esquina inferior derecha */}
      <div className="fixed bottom-6 right-8 w-40 h-40 pointer-events-none z-50 animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-300">
        <Image
          src="/images/mascot/chigui-welcome.png"
          alt="Capibara saludando"
          fill
          className="object-contain drop-shadow-xl hover:scale-105 transition-transform duration-300 pointer-events-auto"
        />
      </div>
    </div>
  );
}
