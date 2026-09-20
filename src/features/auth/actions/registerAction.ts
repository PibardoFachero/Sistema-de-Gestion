'use server';

import { cookies, headers } from 'next/headers';
import { registerSchema } from '@/features/auth/schemas/registerSchema';
import type { RegisterActionResponse, RegisterFormData } from '@/features/auth/types/auth.types';
import { createClient } from '@/lib/supabase/server';

export async function registerUser(formData: RegisterFormData): Promise<RegisterActionResponse> {
  const validationResult = registerSchema.safeParse(formData);

  if (!validationResult.success) {
    const flattenedErrors = validationResult.error.flatten().fieldErrors;
    return {
      success: false,
      error: 'Por favor corrige los errores del formulario.',
      fieldErrors: flattenedErrors as RegisterActionResponse['fieldErrors'],
    };
  }

  const { firstName, lastName, username, email, password } = validationResult.data;

  try {
    let siteUrl = '';
    try {
      const headersList = await headers();
      const host = headersList.get('x-forwarded-host') || headersList.get('host');
      const proto = headersList.get('x-forwarded-proto') || 'http';
      if (host) {
        siteUrl = `${proto}://${host}`;
      }
    } catch {
      // Fallback si no está disponible el contexto de headers
    }

    if (!siteUrl && process.env.NEXT_PUBLIC_SITE_URL) {
      siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    }

    if (
      siteUrl &&
      (siteUrl.includes('172.') || siteUrl.includes('192.168.') || siteUrl.includes('10.'))
    ) {
      siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    }

    if (!siteUrl) {
      siteUrl = 'http://localhost:3000';
    }

    siteUrl = siteUrl.replace(/\/$/, '');

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
        data: {
          first_name: firstName,
          last_name: lastName,
          username,
          nombre_usuario: username,
          full_name: `${firstName} ${lastName}`.trim(),
        },
      },
    });

    if (error) {
      // Manejar mensajes de error comunes de Supabase Auth
      if (error.message.toLowerCase().includes('already registered')) {
        return {
          success: false,
          error: 'Este correo electrónico ya se encuentra registrado.',
        };
      }

      return {
        success: false,
        error: error.message || 'Ocurrió un error al registrar la cuenta.',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No se pudo crear el usuario. Inténtalo de nuevo.',
      };
    }

    // En Supabase con confirmación de correo activa, si el usuario ya existe
    // data.user existe pero user.identities viene vacío para prevenir enumeración
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        success: false,
        error: 'Este correo electrónico ya se encuentra registrado. Por favor inicia sesión.',
      };
    }

    // En caso de que Supabase haya emitido una sesión automáticamente,
    // cerramos la sesión para garantizar que no pase al onboarding sin confirmar
    if (data.session) {
      await supabase.auth.signOut();
    }

    // Establecer cookie temporal que autoriza ver la pantalla /verificar-correo
    const cookieStore = await cookies();
    cookieStore.set('just_registered_email', email, {
      path: '/',
      httpOnly: false,
      maxAge: 60 * 15, // 15 minutos
      sameSite: 'lax',
    });

    return {
      success: true,
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Error inesperado al conectar con el servidor. Inténtalo más tarde.',
    };
  }
}
