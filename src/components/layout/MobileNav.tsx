'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FolderKanban, Calendar, BarChart2, Sparkles, LibraryBig } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant/30 px-2 py-2 pb-safe flex items-center justify-between z-50">
      <NavItem href="/" icon={<Home className="size-5" />} label="Inicio" active={pathname === '/'} />
      <NavItem href="/proyectos" icon={<FolderKanban className="size-5" />} label="Proyectos" active={pathname.startsWith('/proyectos')} />
      <NavItem href="/temas" icon={<LibraryBig className="size-5" />} label="Temas" active={pathname.startsWith('/temas')} />
      <NavItem href="/calendario" icon={<Calendar className="size-5" />} label="Calendario" active={pathname.startsWith('/calendario')} />
      <NavItem href="/analitica" icon={<BarChart2 className="size-5" />} label="Analítica" active={pathname.startsWith('/analitica')} />
      <NavItem href="/ia" icon={<Sparkles className="size-5" />} label="IA" active={pathname.startsWith('/ia')} />
    </nav>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 ${
        active ? 'text-primary' : 'text-outline hover:text-on-surface'
      }`}
    >
      <div className={`${active ? 'bg-surface-container-high' : ''} p-1.5 rounded-full transition-colors`}>
        {icon}
      </div>
      <span className={`text-[10px] font-medium leading-tight ${active ? 'font-semibold' : ''}`}>{label}</span>
    </Link>
  );
}
