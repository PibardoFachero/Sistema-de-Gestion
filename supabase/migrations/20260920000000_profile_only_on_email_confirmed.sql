-- ==============================================================================
-- Migración: Crear perfil en 'public.profiles' ÚNICAMENTE cuando el correo esté confirmado
-- ==============================================================================
-- Este script modifica la función y el trigger de auth.users para que NO inserte
-- en public.profiles mientras new.email_confirmed_at sea NULL.
-- ==============================================================================

-- 1. Actualizar la función handle_new_user()
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Solo insertar en public.profiles cuando el correo electrónico esté efectivamente confirmado
  -- (evita registrar datos en la base de datos si el usuario no ha hecho clic en el enlace de verificación)
  if new.email_confirmed_at is not null then
    insert into public.profiles (
      id,
      nombre_usuario,
      fecha_registro,
      racha_activa,
      racha_maxima
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
      0
    )
    on conflict (id) do update set
      nombre_usuario = coalesce(excluded.nombre_usuario, public.profiles.nombre_usuario);
  end if;

  return new;
end;
$$;

-- 2. Eliminar trigger anterior que solo escuchaba en insert
drop trigger if exists on_auth_user_created on auth.users;

-- 3. Crear trigger que escucha en INSERT y en UPDATE de email_confirmed_at
-- Si el usuario se crea sin confirmar el correo, no se crea perfil en 'profiles'.
-- En cuanto hace clic en el enlace de su correo, Supabase actualiza email_confirmed_at y se crea su perfil.
create trigger on_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Limpiar perfiles creados previamente para usuarios sin correo confirmado
delete from public.profiles
where id in (
  select id from auth.users where email_confirmed_at is null
);
