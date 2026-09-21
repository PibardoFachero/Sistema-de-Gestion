-- ==============================================================================
-- Migración: Agregar columna 'fecha_inicio' a la tabla 'tareas'
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu panel de Supabase si la columna aún no existe:
-- URL: https://supabase.com/dashboard/project/nxjqilasqjrjpvmmjxve/sql
-- ==============================================================================

alter table public.tareas add column if not exists fecha_inicio timestamp with time zone;
alter table public.tareas add column if not exists url_recomendada text;
