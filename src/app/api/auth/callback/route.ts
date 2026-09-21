import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  const getRedirectUrl = (path: string) => {
    if (isLocalEnv) {
      return `${origin}${path}`;
    } else if (forwardedHost) {
      return `https://${forwardedHost}${path}`;
    } else {
      return `${origin}${path}`;
    }
  };

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(getRedirectUrl(next));
      response.cookies.delete('just_registered_email');
      return response;
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (!error) {
      const response = NextResponse.redirect(getRedirectUrl(next));
      response.cookies.delete('just_registered_email');
      return response;
    }
  }

  // Si ocurre un error, redirigir al login con el parámetro de error correspondiente
  const isResetFlow = next.includes('restablecer');
  const isOnboardingFlow = next.includes('onboarding');
  const errorParam = isResetFlow
    ? 'reset_link_expired'
    : isOnboardingFlow
      ? 'verification_link_expired'
      : 'oauth_error';

  return NextResponse.redirect(getRedirectUrl(`/login?error=${errorParam}`));
}
