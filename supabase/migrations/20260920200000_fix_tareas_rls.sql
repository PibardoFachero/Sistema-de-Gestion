-- ==============================================================================
-- Migración: Políticas RLS para la tabla 'tareas'
-- ==============================================================================
-- Para solucionar el error: new row violates row-level security policy for table "tareas"
-- Ejecuta este script en el SQL Editor de tu panel de Supabase:
-- URL: https://supabase.com/dashboard/project/nxjqilasqjrjpvmmjxve/sql
-- ==============================================================================

-- 1. Asegurar que RLS esté habilitado en tareas
alter table public.tareas enable row level security;

-- 2. Permitir inserción de tareas a usuarios autenticados
drop policy if exists "Los usuarios autenticados pueden insertar tareas" on public.tareas;
drop policy if exists "Usuarios pueden insertar tareas" on public.tareas;
drop policy if exists "Enable insert for authenticated users only" on public.tareas;
create policy "Los usuarios autenticados pueden insertar tareas"
  on public.tareas for insert
  to authenticated
  with check (true);

-- 3. Permitir ver tareas
drop policy if exists "Los usuarios autenticados pueden ver tareas" on public.tareas;
drop policy if exists "Usuarios pueden ver tareas" on public.tareas;
create policy "Los usuarios autenticados pueden ver tareas"
  on public.tareas for select
  to authenticated
  using (true);

-- 4. Permitir actualizar tareas (marcar como completada/desmarcar)
drop policy if exists "Los usuarios autenticados pueden actualizar tareas" on public.tareas;
drop policy if exists "Usuarios pueden actualizar tareas" on public.tareas;
create policy "Los usuarios autenticados pueden actualizar tareas"
  on public.tareas for update
  to authenticated
  using (true);

-- 5. Permitir eliminar tareas
drop policy if exists "Los usuarios autenticados pueden eliminar tareas" on public.tareas;
drop policy if exists "Usuarios pueden eliminar tareas" on public.tareas;
create policy "Los usuarios autenticados pueden eliminar tareas"
  on public.tareas for delete
  to authenticated
  using (true);

-- 6. Asegurar que las columnas 'fecha_inicio' y 'url_recomendada' existan en la tabla 'tareas'
alter table public.tareas add column if not exists fecha_inicio timestamp with time zone;
alter table public.tareas add column if not exists url_recomendada text;

