-- ==============================================================================
-- Migración: Registro de última sesión en public.profiles
-- ==============================================================================
-- Este script se puede ejecutar en el SQL Editor del panel de Supabase.
-- Asegura que la tabla 'profiles' cuente con la columna 'ultima_sesion'
-- para almacenar la fecha y hora en la que el usuario cierra su sesión.
-- ==============================================================================

-- 1. Añadir la columna 'ultima_sesion' si no existe
alter table public.profiles add column if not exists ultima_sesion timestamptz default now();

-- 2. Asegurar que las políticas RLS permitan actualizar y consultar 'profiles'
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
