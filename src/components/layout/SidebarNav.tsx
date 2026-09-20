'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FolderKanban, Calendar, BarChart2, Sparkles, LibraryBig } from 'lucide-react';

export function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: Home, label: 'Inicio' },
    { href: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
    { href: '/temas', icon: LibraryBig, label: 'Temas' },
    { href: '/calendario', icon: Calendar, label: 'Calendario' },
    { href: '/analitica', icon: BarChart2, label: 'Analítica' },
    { href: '/ia', icon: Sparkles, label: 'Asistente IA' },
  ];

  const [sidebarProjects, setSidebarProjects] = React.useState<{id: string, name: string}[]>([]);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('komorebi_projects');
      if (saved) {
        setSidebarProjects(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <nav className="flex-1 px-4 space-y-1 mt-4">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <div key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-surface-container-high text-primary font-semibold'
                  : 'text-on-surface hover:bg-surface-container'
              }`}
            >
              <div className={isActive ? 'text-primary' : 'text-outline'}>
                <Icon className="size-5" />
              </div>
              {item.label}
            </Link>

            {item.href === '/proyectos' && isActive && sidebarProjects.length > 0 && (
              <div className="pl-11 pr-4 py-2 space-y-3 animate-in fade-in duration-200">
                {sidebarProjects.slice(0, 5).map(p => (
                  <SubItem key={p.id} label={p.name} href={`/proyectos/${p.id}`} />
                ))}
              </div>
            )}
            
            {item.href === '/proyectos' && isActive && sidebarProjects.length === 0 && (
              <div className="pl-11 pr-4 py-2 space-y-3 animate-in fade-in duration-200">
                <SubItem label="Aprender Python" />
                <SubItem label="Backend" />
                <SubItem label="Japonés" />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SubItem({ label, href }: { label: string; href?: string }) {
  if (href) {
    return (
      <Link href={href} className="flex items-center gap-3 text-xs text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
        <div className="size-1.5 rounded-full bg-accent-amber/50" />
        {label}
      </Link>
    );
  }
  
  return (
    <div className="flex items-center gap-3 text-xs text-on-surface-variant hover:text-primary cursor-pointer transition-colors">
      <div className="size-1.5 rounded-full bg-accent-amber/50" />
      {label}
    </div>
  );
}
