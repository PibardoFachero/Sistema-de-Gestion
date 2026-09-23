import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { STUDY_TECHNIQUES } from '@/features/study-methods/data/techniques';
import { StudyTimer } from '@/features/study-methods/components/StudyTimer';

export const metadata: Metadata = {
  title: 'Sesión de Estudio | Komorebi',
  description: 'Cronómetro activo para tu sesión de estudio.',
};

interface SesionPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SesionPage({ searchParams }: SesionPageProps) {
  const resolvedSearchParams = await searchParams;
  const techniqueId = typeof resolvedSearchParams.technique === 'string' ? resolvedSearchParams.technique : 'pomodoro';
  
  const technique = STUDY_TECHNIQUES.find(t => t.id === techniqueId) || STUDY_TECHNIQUES[0];

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] animate-in fade-in duration-500">
      <header className="mb-8 flex items-center gap-4">
        <Link 
          href="/tecnicas"
          className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"
          title="Volver a Técnicas"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2C1F14]">
            Sesión en curso
          </h1>
          <p className="text-sm text-on-surface-variant">
            {technique.name} · {technique.shortDescription}
          </p>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <StudyTimer technique={technique} />
      </div>
    </div>
  );
}
