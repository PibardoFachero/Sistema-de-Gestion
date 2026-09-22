'use server';

import { cookies, headers } from 'next/headers';
import { registerSchema } from '@/features/auth/schemas/registerSchema';
import type { RegisterActionResponse, RegisterFormData } from '@/features/auth/types/auth.types';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { hashPasswordForBackend } from '@/lib/auth/passwordSecurity';

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
    const supabase = await createClient();
    const adminDb = getAdminClient();
    const db = adminDb || supabase;

    // 1. [VALIDACIÓN BACKEND DE UNICIDAD]: Verificar que el nombre de usuario y correo no se repitan
    try {
      const { data: availability } = await supabase.rpc('check_user_availability', {
        p_username: username,
        p_email: email,
      });

      if (availability) {
        if (availability.username_taken) {
          return {
            success: false,
            error: 'El nombre de usuario ya está en uso. Por favor elige otro.',
            fieldErrors: { username: ['Este nombre de usuario ya está registrado'] },
          };
        }
        if (availability.email_taken) {
          return {
            success: false,
            error: 'Este correo electrónico ya se encuentra registrado. Por favor inicia sesión.',
            fieldErrors: { email: ['Este correo electrónico ya está registrado'] },
          };
        }
      }
    } catch {
      // Si la función RPC aún no está creada en Supabase, realizar verificación directa
    }

    // Verificación secundaria directa en tabla 'profiles'
    const { data: existingProfile } = await db
      .from('profiles')
      .select('id')
      .ilike('nombre_usuario', username.trim())
      .maybeSingle();

    if (existingProfile) {
      return {
        success: false,
        error: 'El nombre de usuario ya está en uso. Por favor elige otro.',
        fieldErrors: { username: ['Este nombre de usuario ya está registrado'] },
      };
    }

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

    // 2. [ENCRIPTACIÓN DE CONTRASEÑA EN EL BACKEND]:
    // Cifrar la contraseña en nuestro servidor antes de enviarla a Supabase
    const hashedPassword = hashPasswordForBackend(password);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: hashedPassword,
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
