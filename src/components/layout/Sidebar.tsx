import Link from 'next/link';
import { Home, FolderKanban, Calendar, BarChart2, Sparkles, LogOut, PanelLeftClose } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-outline-variant/30 bg-surface h-screen sticky top-0 left-0">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <FolderKanban className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-primary tracking-tight leading-tight">Komorebi</h2>
            <p className="text-[10px] uppercase font-semibold text-accent-amber tracking-wider">Study Studio</p>
          </div>
        </div>
        <button className="text-outline hover:text-primary transition-colors">
          <PanelLeftClose className="size-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        <SidebarItem href="/" icon={<Home className="size-5" />} label="Inicio" />
        <SidebarItem href="/proyectos" icon={<FolderKanban className="size-5" />} label="Proyectos" active />
        <div className="pl-11 pr-4 py-2 space-y-3">
          <SubItem label="Aprender Python" />
          <SubItem label="Backend" />
          <SubItem label="Japonés" />
        </div>
        <SidebarItem href="/calendario" icon={<Calendar className="size-5" />} label="Calendario" />
        <SidebarItem href="/analitica" icon={<BarChart2 className="size-5" />} label="Analítica" />
        <SidebarItem href="/ia" icon={<Sparkles className="size-5" />} label="Asistente IA" />
      </nav>

      <div className="p-4 mt-auto">
        <div className="bg-surface-container rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:bg-surface-container-high transition-colors">
          <div className="size-10 rounded-full bg-surface-tint/20 flex-shrink-0 flex items-center justify-center overflow-hidden">
             {/* Profile image placeholder */}
             <span className="text-primary font-bold text-sm">SO</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-on-surface truncate">Sofía</p>
            <p className="text-xs text-on-surface-variant truncate">Estudiante</p>
          </div>
          <LogOut className="size-4 text-outline" />
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active 
          ? 'bg-surface-container-high text-primary font-semibold' 
          : 'text-on-surface hover:bg-surface-container text-on-surface'
      }`}
    >
      <div className={active ? 'text-primary' : 'text-outline'}>{icon}</div>
      {label}
    </Link>
  );
}

function SubItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
      <div className="size-1.5 rounded-full bg-accent-amber/50" />
      {label}
    </div>
  );
}
