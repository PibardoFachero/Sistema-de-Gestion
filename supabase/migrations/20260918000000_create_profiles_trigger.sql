-- ==============================================================================
-- Migración: Trigger para vincular auth.users con public.profiles
-- ==============================================================================
-- Este script se puede ejecutar en el SQL Editor del panel de Supabase.
-- Crea la función de base de datos y el trigger para que, al registrar un usuario
-- en Supabase Auth, se cree automáticamente su fila correspondiente en 'profiles'.
-- ==============================================================================

-- 1. Función que inserta automáticamente el perfil del nuevo usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    nombre_usuario,
    fecha_registro,
    racha_activa,
    racha_maxima,
    notificaciones_activas
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'nombre_usuario',
      split_part(new.email, '@', 1)
    ),
    now(),
    0,
    0,
    true
  )
  on conflict (id) do update set
    nombre_usuario = coalesce(excluded.nombre_usuario, public.profiles.nombre_usuario);

  return new;
end;
$$;

-- 2. Trigger en auth.users tras cada inserción
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Asegurar Row Level Security (RLS) en la tabla profiles
alter table public.profiles enable row level security;

-- Política de lectura: cada usuario autenticado puede leer su propio perfil
drop policy if exists "Los usuarios pueden ver su propio perfil" on public.profiles;
create policy "Los usuarios pueden ver su propio perfil"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Política de actualización: cada usuario autenticado puede modificar su propio perfil
drop policy if exists "Los usuarios pueden actualizar su propio perfil" on public.profiles;
create policy "Los usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);
