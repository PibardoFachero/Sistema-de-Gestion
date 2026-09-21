-- ==============================================================================
-- Migración: Agregar columna 'completado' a la tabla 'projects'
-- ==============================================================================
-- Ejecuta este script en el SQL Editor de tu panel de Supabase:
-- URL: https://supabase.com/dashboard/project/nxjqilasqjrjpvmmjxve/sql
-- ==============================================================================

alter table public.projects add column if not exists completado boolean default false;
