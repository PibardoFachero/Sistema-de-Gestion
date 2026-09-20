-- ==============================================================================
-- Migración: Añadir columna telefono a public.profiles
-- ==============================================================================
-- Este script se puede ejecutar en el SQL Editor del panel de Supabase.
-- Incorpora la columna 'telefono' para almacenar el número telefónico con su prefijo.
-- ==============================================================================

alter table public.profiles
  add column if not exists telefono text;
