-- ==============================================================================
-- Migración: Unicidad de Nombre de Usuario, Función de Verificación y Permisos RLS
-- ==============================================================================
-- Ejecutar en el SQL Editor del panel de Supabase:
-- URL: https://supabase.com/dashboard/project/nxjqilasqjrjpvmmjxve/sql
-- ==============================================================================

-- 1. Índice único insensible a mayúsculas/minúsculas para el nombre de usuario
create unique index if not exists profiles_nombre_usuario_lower_idx
  on public.profiles (lower(trim(nombre_usuario)));

-- 2. Función RPC para verificar disponibilidad de usuario y correo en el backend
create or replace function public.check_user_availability(
  p_username text,
  p_email text,
  p_user_id uuid default null
)
returns json
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_username_taken boolean := false;
  v_email_taken boolean := false;
  v_clean_username text := lower(trim(p_username));
  v_clean_email text := lower(trim(p_email));
begin
  -- 2.1 Verificar si el nombre de usuario ya está registrado en profiles
  if v_clean_username is not null and v_clean_username <> '' then
    select exists (
      select 1 from public.profiles
      where lower(trim(nombre_usuario)) = v_clean_username
        and (p_user_id is null or id <> p_user_id)
    ) into v_username_taken;

    -- También verificar en metadatos de auth.users si aún no tiene fila en profiles
    if not v_username_taken then
      select exists (
        select 1 from auth.users
        where (
          lower(trim(coalesce(raw_user_meta_data->>'username', raw_user_meta_data->>'nombre_usuario', ''))) = v_clean_username
        )
        and (p_user_id is null or id <> p_user_id)
      ) into v_username_taken;
    end if;
  end if;

  -- 2.2 Verificar si el correo ya está registrado en auth.users
  if v_clean_email is not null and v_clean_email <> '' then
    select exists (
      select 1 from auth.users
      where lower(trim(email)) = v_clean_email
        and (p_user_id is null or id <> p_user_id)
    ) into v_email_taken;
  end if;

  return json_build_object(
    'username_taken', v_username_taken,
    'email_taken', v_email_taken
  );
end;
$$;

-- Permitir ejecución anónima y autenticada de la función de disponibilidad
revoke execute on function public.check_user_availability(text, text, uuid) from public;
grant execute on function public.check_user_availability(text, text, uuid) to anon, authenticated, service_role;

-- 3. Asegurar políticas RLS para inserción y gestión de tareas
alter table public.tareas enable row level security;

drop policy if exists "Tareas: propietario del proyecto puede crear" on public.tareas;
create policy "Tareas: propietario del proyecto puede crear"
  on public.tareas for insert to authenticated
  with check (
    exists (
      select 1 from public.projects project
      where project.id = tareas.id_proyecto
        and project.user_id = auth.uid()
    )
  );

drop policy if exists "Tareas: propietario del proyecto puede leer" on public.tareas;
create policy "Tareas: propietario del proyecto puede leer"
  on public.tareas for select to authenticated
  using (
    exists (
      select 1 from public.projects project
      where project.id = tareas.id_proyecto
        and project.user_id = auth.uid()
    )
  );

drop policy if exists "Tareas: propietario del proyecto puede actualizar" on public.tareas;
create policy "Tareas: propietario del proyecto puede actualizar"
  on public.tareas for update to authenticated
  using (
    exists (
      select 1 from public.projects project
      where project.id = tareas.id_proyecto
        and project.user_id = auth.uid()
    )
  );

drop policy if exists "Tareas: propietario del proyecto puede eliminar" on public.tareas;
create policy "Tareas: propietario del proyecto puede eliminar"
  on public.tareas for delete to authenticated
  using (
    exists (
      select 1 from public.projects project
      where project.id = tareas.id_proyecto
        and project.user_id = auth.uid()
    )
  );
