-- ==============================================================================
-- Migración: Actualizaciones de Perfil, Avatares e Información Complementaria
-- ==============================================================================
-- Este script se puede ejecutar en el SQL Editor del panel de Supabase.
-- Incorpora las columnas necesarias para:
-- 1. Nombre completo y descripción del perfil
-- 2. Almacenamiento y biblioteca de avatares (avatar_url, avatares_subidos)
-- 3. Información complementaria de aprendizaje (objetivo, ritmo, dificultades, area_prioritaria)
-- 4. Rachas aseguradas (racha_activa, racha_maxima)
-- ==============================================================================

-- 1. Asegurar columnas de identidad y descripción
alter table public.profiles add column if not exists nombre_completo text;
alter table public.profiles add column if not exists descripcion text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists avatares_subidos text[] default array[]::text[];
alter table public.profiles add column if not exists telefono text;

-- 2. Asegurar columnas de información complementaria de aprendizaje
alter table public.profiles add column if not exists objetivo text;
alter table public.profiles add column if not exists ritmo text;
alter table public.profiles add column if not exists dificultades text[];
alter table public.profiles add column if not exists area_prioritaria text[];

-- 3. Asegurar columnas de racha
alter table public.profiles add column if not exists racha_activa integer default 0;
alter table public.profiles add column if not exists racha_maxima integer default 0;

-- 4. Asegurar Row Level Security (RLS) para que el usuario autenticado pueda leer y actualizar
alter table public.profiles enable row level security;

drop policy if exists "Los usuarios pueden ver su propio perfil" on public.profiles;
create policy "Los usuarios pueden ver su propio perfil"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Los usuarios pueden actualizar su propio perfil" on public.profiles;
create policy "Los usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);
