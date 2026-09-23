import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { UserProfileButton } from '@/components/layout/UserProfileButton';
import { TelegramBotWidget } from '@/components/layout/TelegramBotWidget';
import { FolderKanban } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

import { ToastProvider } from '@/components/ui/Toast';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  let username = 'estudiante';
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre_usuario')
        .eq('id', user.id)
        .maybeSingle();

      username =
        profile?.nombre_usuario ||
        user.user_metadata?.username ||
        user.user_metadata?.nombre_usuario ||
        user.email?.split('@')[0] ||
        'estudiante';
    }
  } catch {
    user = null;
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar initialUser={user} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Barra superior visible únicamente en móviles */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-outline-variant/30 bg-surface sticky top-0 z-40">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                <FolderKanban className="size-4" />
              </div>
              <div>
                <h2 className="font-bold text-primary tracking-tight text-sm leading-none">
                  Komorebi
                </h2>
                <p className="text-[9px] uppercase font-semibold text-accent-amber tracking-wider">
                  Study Studio
                </p>
              </div>
            </div>
            <UserProfileButton initialUser={user} compact />
          </header>

          <main id="contenido" className="flex-1 pb-20 md:pb-0 max-w-full overflow-x-hidden">
            <div className="mx-auto max-w-5xl px-4 md:px-8 py-6 md:py-10">{children}</div>
          </main>
        </div>

        <MobileNav />

        {/* Asistente de Telegram disponible en todas las vistas */}
        <TelegramBotWidget username={username} />
      </div>
    </ToastProvider>
  );
}
