import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from '@/lib/supabase/env';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  let env;
  try {
    env = getSupabaseEnv();
  } catch {
    // Si no están configuradas las variables en desarrollo, dejar pasar
    return supabaseResponse;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Validar sesión con Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isServerAction = request.headers.has('next-action');
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/recuperar-contrasena');
  const isAuthCallback = pathname.startsWith('/auth') || pathname.startsWith('/api/auth');
  const isPasswordResetRoute = pathname.startsWith('/restablecer-contrasena');

  // Si no está autenticado y no es una ruta de autenticación/callback/restablecimiento ni una Server Action:
  // Siempre redirigir al login
  if (!user && !isAuthRoute && !isAuthCallback && !isPasswordResetRoute && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // Si ya está autenticado e intenta navegar a /login o /register (y no es una Server Action):
  // Redirigir al inicio del panel
  if (user && isAuthRoute && !isServerAction) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
