import Link from 'next/link';
import { Home, FolderKanban, Calendar, BarChart2, Sparkles } from 'lucide-react';

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant/30 px-2 py-2 pb-safe flex items-center justify-between z-50">
      <NavItem href="/" icon={<Home className="size-5" />} label="Inicio" />
      <NavItem href="/proyectos" icon={<FolderKanban className="size-5" />} label="Proyectos" active />
      <NavItem href="/calendario" icon={<Calendar className="size-5" />} label="Calendario" />
      <NavItem href="/analitica" icon={<BarChart2 className="size-5" />} label="Analítica" />
      <NavItem href="/ia" icon={<Sparkles className="size-5" />} label="Asistente IA" />
    </nav>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex flex-col items-center justify-center w-16 gap-1 py-1 ${
        active ? 'text-primary' : 'text-outline hover:text-on-surface'
      }`}
    >
      <div className={`${active ? 'bg-surface-container-high' : ''} p-1.5 rounded-full transition-colors`}>
        {icon}
      </div>
      <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>{label}</span>
    </Link>
  );
}
