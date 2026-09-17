import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-3 rounded font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          <GraduationCap aria-hidden="true" className="size-7 text-teal-700" />
          <span>Aula</span>
        </Link>
        <span className="ml-auto text-sm text-slate-500">Proyecto universitario</span>
      </div>
    </header>
  );
}
