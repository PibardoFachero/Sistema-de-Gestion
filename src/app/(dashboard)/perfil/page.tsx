import { redirect } from 'next/navigation';
import { ProfileDashboard, type ProfileDashboardData } from '@/components/profile/ProfileDashboard';
import { createClient } from '@/lib/supabase/server';

type ProfileRecord = {
  nombre_usuario?: string | null;
  rol_condicion?: string | null;
  edad?: string | null;
  situacion_laboral?: string | null;
  tiempo_diario_min?: string | null;
  jornada_horarios?: string | null;
  metodologia?: string | null;
  experiencia?: string | null;
  contexto_personal?: string | null;
  racha_activa?: number | null;
  racha_maxima?: number | null;
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('nombre_usuario, rol_condicion, edad, situacion_laboral, tiempo_diario_min, jornada_horarios, metodologia, experiencia, racha_activa, racha_maxima')
    .eq('id', user.id)
    .maybeSingle<ProfileRecord>();

  // La lectura independiente permite que la pantalla siga funcionando mientras
  // la migración de contexto_personal llega al entorno compartido.
  const { data: personalProfile } = await supabase
    .from('profiles')
    .select('contexto_personal')
    .eq('id', user.id)
    .maybeSingle<{ contexto_personal?: string | null }>();

  const meta = user.user_metadata;
  const username = profile?.nombre_usuario || meta.username || meta.nombre_usuario || user.email?.split('@')[0] || 'estudiante';
  const name = meta.full_name || [meta.first_name, meta.last_name].filter(Boolean).join(' ') || username;
  const initials = getInitials(name, username);

  const dashboardProfile: ProfileDashboardData = {
    name,
    username,
    email: user.email ?? 'Correo no disponible',
    initials,
    avatarUrl: meta.avatar_url || meta.picture || undefined,
    role: profile?.rol_condicion,
    age: profile?.edad,
    workSituation: profile?.situacion_laboral,
    availability: profile?.tiempo_diario_min,
    schedule: profile?.jornada_horarios,
    methodology: profile?.metodologia,
    experience: profile?.experiencia,
    personalContext: personalProfile?.contexto_personal,
    currentStreak: profile?.racha_activa,
    bestStreak: profile?.racha_maxima,
    lastSignInAt: user.last_sign_in_at,
  };

  return <ProfileDashboard profile={dashboardProfile} />;
}

function getInitials(name: string, username: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0]?.slice(0, 2) || username.slice(0, 2) || 'ES').toUpperCase();
}
