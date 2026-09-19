-- ==============================================================================
-- Migración: Columnas para el perfil de Onboarding de Komorebi
-- ==============================================================================
-- Este script se puede ejecutar en el SQL Editor del panel de Supabase.
-- Asegura que la tabla 'profiles' cuente con todas las columnas necesarias
-- para almacenar las respuestas de la encuesta inicial (onboarding) y datos base.
-- ==============================================================================

-- 1. Columnas base y timestamps (evita el error 'record "new" has no field "updated_at"')
alter table public.profiles add column if not exists fecha_registro timestamptz default now();
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();
alter table public.profiles add column if not exists racha_activa integer default 0;
alter table public.profiles add column if not exists racha_maxima integer default 0;

-- 2. Si la columna 'situacion_laboral' fue creada previamente con la errata 'sittuacion_laboral',
-- la renombramos de manera segura.
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'sittuacion_laboral'
  ) and not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'situacion_laboral'
  ) then
    alter table public.profiles rename column sittuacion_laboral to situacion_laboral;
  end if;
end $$;

-- 3. Asegurar que las columnas de las 7 preguntas de la encuesta existan en public.profiles
alter table public.profiles add column if not exists rol_condicion text;
alter table public.profiles add column if not exists edad text;
alter table public.profiles add column if not exists situacion_laboral text;
alter table public.profiles add column if not exists jornada_horarios text;
alter table public.profiles add column if not exists tiempo_diario_min text;
alter table public.profiles add column if not exists metodologia text;
alter table public.profiles add column if not exists experiencia text;

-- 4. Confirmar que la política RLS permita a los usuarios autenticados actualizar su propio perfil
alter table public.profiles enable row level security;

drop policy if exists "Los usuarios pueden actualizar su propio perfil" on public.profiles;
create policy "Los usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Los usuarios pueden ver su propio perfil" on public.profiles;
create policy "Los usuarios pueden ver su propio perfil"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);
