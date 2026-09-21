-- Seguridad y base de analítica personal.
-- Requiere las columnas existentes public.projects(id, user_id) y public.tareas(id_proyecto).
-- No modifica datos históricos: completed_at queda null para tareas ya completadas
-- porque no existe una fecha verificable de finalización.

alter table public.tareas add column if not exists completed_at timestamp with time zone;

-- La relación existía en los datos, pero no como restricción de base de datos.
-- Se permite null para no cambiar el contrato de inserción vigente, pero cualquier
-- id_proyecto informado debe pertenecer a un proyecto existente.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tareas_id_proyecto_fkey'
      and conrelid = 'public.tareas'::regclass
  ) then
    alter table public.tareas
      add constraint tareas_id_proyecto_fkey
      foreign key (id_proyecto) references public.projects(id) on delete cascade;
  end if;
end;
$$;

create index if not exists tareas_id_proyecto_fecha_inicio_idx
  on public.tareas (id_proyecto, fecha_inicio);
create index if not exists tareas_id_proyecto_completado_idx
  on public.tareas (id_proyecto, completado);
create index if not exists projects_user_id_fecha_limite_idx
  on public.projects (user_id, fecha_limite);

-- Reemplaza las políticas permisivas creadas por la migración anterior local.
drop policy if exists "Los usuarios autenticados pueden insertar tareas" on public.tareas;
drop policy if exists "Los usuarios autenticados pueden ver tareas" on public.tareas;
drop policy if exists "Los usuarios autenticados pueden actualizar tareas" on public.tareas;
drop policy if exists "Los usuarios autenticados pueden eliminar tareas" on public.tareas;
drop policy if exists "Tareas: propietario del proyecto puede leer" on public.tareas;
drop policy if exists "Tareas: propietario del proyecto puede crear" on public.tareas;
drop policy if exists "Tareas: propietario del proyecto puede actualizar" on public.tareas;
drop policy if exists "Tareas: propietario del proyecto puede eliminar" on public.tareas;

alter table public.tareas enable row level security;

create policy "Tareas: propietario del proyecto puede leer"
  on public.tareas for select to authenticated
  using (
    exists (
      select 1 from public.projects project
      where project.id = tareas.id_proyecto
        and project.user_id = (select auth.uid())
    )
  );

create policy "Tareas: propietario del proyecto puede crear"
  on public.tareas for insert to authenticated
  with check (
    exists (
      select 1 from public.projects project
      where project.id = tareas.id_proyecto
        and project.user_id = (select auth.uid())
    )
  );

create policy "Tareas: propietario del proyecto puede actualizar"
  on public.tareas for update to authenticated
  using (
    exists (
      select 1 from public.projects project
      where project.id = tareas.id_proyecto
        and project.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects project
      where project.id = tareas.id_proyecto
        and project.user_id = (select auth.uid())
    )
  );

create policy "Tareas: propietario del proyecto puede eliminar"
  on public.tareas for delete to authenticated
  using (
    exists (
      select 1 from public.projects project
      where project.id = tareas.id_proyecto
        and project.user_id = (select auth.uid())
    )
  );

-- El trigger registra solo cambios nuevos desde la aplicación de esta migración.
create schema if not exists private;
create or replace function private.set_tarea_completed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.completado is true and coalesce(old.completado, false) is false then
    new.completed_at := now();
  elsif new.completado is false then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.set_tarea_completed_at() from public;
drop trigger if exists set_tarea_completed_at on public.tareas;
create trigger set_tarea_completed_at
  before update of completado on public.tareas
  for each row execute function private.set_tarea_completed_at();

-- Disponibilidad declarada por cada usuario para evaluar adherencia en el futuro.
-- Su contenido es privado y no se envía a servicios externos desde esta migración.
create table if not exists public.calendar_availability (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Caracas',
  availability jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint calendar_availability_is_object check (jsonb_typeof(availability) = 'object')
);

alter table public.calendar_availability enable row level security;
drop policy if exists "Disponibilidad: usuario puede leer la propia" on public.calendar_availability;
drop policy if exists "Disponibilidad: usuario puede crear la propia" on public.calendar_availability;
drop policy if exists "Disponibilidad: usuario puede actualizar la propia" on public.calendar_availability;
drop policy if exists "Disponibilidad: usuario puede eliminar la propia" on public.calendar_availability;

create policy "Disponibilidad: usuario puede leer la propia"
  on public.calendar_availability for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Disponibilidad: usuario puede crear la propia"
  on public.calendar_availability for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Disponibilidad: usuario puede actualizar la propia"
  on public.calendar_availability for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Disponibilidad: usuario puede eliminar la propia"
  on public.calendar_availability for delete to authenticated
  using ((select auth.uid()) = user_id);
