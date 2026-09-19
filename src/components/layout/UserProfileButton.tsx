'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { logoutUser } from '@/features/auth/actions/logoutAction';

interface UserProfileButtonProps {
  initialUser?: User | null;
  compact?: boolean;
}

export function UserProfileButton({ initialUser, compact = false }: UserProfileButtonProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [prevInitialUser, setPrevInitialUser] = useState(initialUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Sincronizar usuario si cambia la prop en una re-renderización del servidor
  if (initialUser !== prevInitialUser) {
    setPrevInitialUser(initialUser);
    setUser(initialUser ?? null);
  }

  useEffect(() => {
    const supabase = createClient();

    // Sincronizar usuario activo si no vino por SSR o ante cualquier actualización
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
      }
    });

    // Escuchar eventos de sesión (login, token refresh, logout, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const meta = user?.user_metadata || {};

  const username =
    meta.username ||
    meta.nombre_usuario ||
    meta.first_name ||
    (user?.email ? user.email.split('@')[0] : 'Estudiante');

  const fullName =
    meta.full_name ||
    (meta.first_name && meta.last_name ? `${meta.first_name} ${meta.last_name}`.trim() : '') ||
    meta.first_name ||
    '';

  const calculateInitials = () => {
    if (meta.first_name && meta.last_name) {
      return `${meta.first_name[0]}${meta.last_name[0]}`.toUpperCase();
    }
    if (fullName && fullName.includes(' ')) {
      const parts = fullName.trim().split(/\s+/);
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    if (username && username.length > 0) {
      return username.slice(0, 2).toUpperCase();
    }
    return 'ES';
  };

  const initials = calculateInitials();
  const avatarUrl = meta.avatar_url || meta.picture || undefined;

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // 1. Cerrar sesión en el servidor primero
      await logoutUser();
    } catch (err) {
      console.error('Error al cerrar sesión en el servidor:', err);
    }

    try {
      // 2. Limpiar tokens y almacenamiento local en el cliente
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error al cerrar sesión en el cliente:', err);
    }

    setUser(null);
    router.push('/login');
    router.refresh();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/perfil" className="flex min-w-0 items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container py-1 pl-1.5 pr-3 transition-colors hover:bg-surface-container-high">
          <div className="size-7 rounded-full bg-surface-tint/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={username} className="size-full object-cover" />
            ) : (
              <span className="text-primary font-bold text-xs select-none">{initials}</span>
            )}
          </div>
          <span className="text-xs font-semibold text-on-surface max-w-[110px] truncate" title={username}>
            {username}
          </span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          title="Cerrar sesión"
          className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
          aria-label="Cerrar sesión"
        >
          {isLoggingOut ? (
            <Loader2 className="size-4 animate-spin text-outline" />
          ) : (
            <LogOut className="size-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-container rounded-2xl p-3 flex items-center gap-3 hover:bg-surface-container-high transition-colors group">
      <Link href="/perfil" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition-colors group-hover:text-primary">
      <div className="size-10 rounded-full bg-surface-tint/20 flex-shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant/20">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={username} className="size-full object-cover" />
        ) : (
          <span className="text-primary font-bold text-sm select-none">{initials}</span>
        )}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-sm font-semibold text-on-surface truncate" title={username}>
          {username}
        </p>
        <p className="text-xs text-on-surface-variant truncate" title={fullName || 'Estudiante'}>
          {fullName && fullName !== username ? fullName : 'Estudiante'}
        </p>
      </div>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        title="Cerrar sesión"
        className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
        aria-label="Cerrar sesión"
      >
        {isLoggingOut ? (
          <Loader2 className="size-4 animate-spin text-outline" />
        ) : (
          <LogOut className="size-4" />
        )}
      </button>
    </div>
  );
}
