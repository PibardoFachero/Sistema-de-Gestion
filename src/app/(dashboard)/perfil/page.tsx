import { redirect } from 'next/navigation';
import { ProfileDashboard, type ProfileDashboardData } from '@/components/profile/ProfileDashboard';
import { createClient } from '@/lib/supabase/server';

type ProfileRecord = {
  nombre_usuario?: string | null;
  nombre_completo?: string | null;
  descripcion?: string | null;
  contexto_personal?: string | null;
  avatar_url?: string | null;
  avatares_subidos?: string[] | null;
  rol_condicion?: string | null;
  edad?: string | null;
  situacion_laboral?: string | null;
  tiempo_diario_min?: string | null;
  jornada_horarios?: string | null;
  metodologia?: string | null;
  experiencia?: string | null;
  objetivo?: string | null;
  ritmo?: string | null;
  dificultades?: string[] | string | null;
  area_prioritaria?: string[] | string | null;
  racha_activa?: number | null;
  racha_maxima?: number | null;
  telefono?: string | null;
  telegram_username?: string | null;
  telegram_verified_at?: string | null;
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Lectura completa de public.profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<ProfileRecord>();

  const meta = user.user_metadata || {};
  const username =
    profile?.nombre_usuario ||
    meta.username ||
    meta.nombre_usuario ||
    user.email?.split('@')[0] ||
    'estudiante';

  // Extraer nombre y apellido separados
  let firstName = meta.first_name || '';
  let lastName = meta.last_name || '';

  if (!firstName && !lastName && profile?.nombre_completo) {
    const parts = profile.nombre_completo.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  } else if (!firstName && !lastName && meta.full_name) {
    const parts = meta.full_name.trim().split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  const name = [firstName, lastName].filter(Boolean).join(' ') || username;
  const initials = getInitials(name, username);
  const avatarUrl = profile?.avatar_url || meta.avatar_url || meta.picture || undefined;

  // Normalizar dificultades en array de strings
  let difficulties: string[] = [];
  if (Array.isArray(profile?.dificultades)) {
    difficulties = profile.dificultades;
  } else if (typeof profile?.dificultades === 'string' && profile.dificultades.trim()) {
    difficulties = profile.dificultades
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  // Normalizar áreas prioritarias en array de strings
  let priorityAreas: string[] = [];
  if (Array.isArray(profile?.area_prioritaria)) {
    priorityAreas = profile.area_prioritaria;
  } else if (typeof profile?.area_prioritaria === 'string' && profile.area_prioritaria.trim()) {
    priorityAreas = profile.area_prioritaria
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  // Detección de método de autenticación y presencia de contraseña
  const providers = (user.app_metadata?.providers as string[] | undefined) || [];
  const identities = user.identities || [];
  const hasPassword =
    Boolean(user.user_metadata?.has_password) ||
    providers.includes('email') ||
    identities.some((identity) => identity.provider === 'email');
  const isGoogleUser =
    providers.includes('google') ||
    user.app_metadata?.provider === 'google' ||
    identities.some((identity) => identity.provider === 'google');

  // Normalizar avatares subidos
  let uploadedAvatars: string[] = [];
  if (Array.isArray(profile?.avatares_subidos)) {
    uploadedAvatars = profile.avatares_subidos;
  } else if (typeof profile?.avatares_subidos === 'string') {
    try {
      const parsed = JSON.parse(profile.avatares_subidos);
      uploadedAvatars = Array.isArray(parsed) ? parsed : [profile.avatares_subidos];
    } catch {
      uploadedAvatars = [profile.avatares_subidos];
    }
  }
  if (uploadedAvatars.length === 0 && avatarUrl) {
    uploadedAvatars = [avatarUrl];
  }

  const dashboardProfile: ProfileDashboardData = {
    firstName,
    lastName,
    name,
    username,
    email: user.email ?? 'Correo no disponible',
    initials,
    avatarUrl,
    uploadedAvatars,
    role: profile?.rol_condicion,
    age: profile?.edad,
    workSituation: profile?.situacion_laboral,
    availability: profile?.tiempo_diario_min,
    schedule: profile?.jornada_horarios,
    methodology: profile?.metodologia,
    experience: profile?.experiencia,
    personalContext: profile?.contexto_personal || profile?.descripcion || '',
    description: profile?.descripcion || profile?.contexto_personal || '',
    phone: profile?.telefono ?? (meta.phone || meta.telefono || null),
    telegramUsername: profile?.telegram_username,
    telegramVerifiedAt: profile?.telegram_verified_at,
    objective: profile?.objetivo || '',
    pace: profile?.ritmo || '',
    difficulties,
    priorityAreas,
    currentStreak: typeof profile?.racha_activa === 'number' ? profile.racha_activa : 0,
    bestStreak: typeof profile?.racha_maxima === 'number' ? profile.racha_maxima : 0,
    lastSignInAt: user.last_sign_in_at,
    hasPassword,
    isGoogleUser,
  };

  return <ProfileDashboard profile={dashboardProfile} />;
}

function getInitials(name: string, username: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0]?.slice(0, 2) || username.slice(0, 2) || 'ES').toUpperCase();
}
