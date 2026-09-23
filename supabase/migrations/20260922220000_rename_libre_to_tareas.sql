-- Reemplazar los valores existentes en la base de datos
UPDATE public.bloques_disponibilidad
SET tipo = 'tareas'
WHERE tipo = 'libre';

-- Eliminar el check constraint existente y crear uno nuevo
ALTER TABLE public.bloques_disponibilidad
DROP CONSTRAINT IF EXISTS bloques_disponibilidad_tipo_check;

ALTER TABLE public.bloques_disponibilidad
ADD CONSTRAINT bloques_disponibilidad_tipo_check
CHECK (tipo IN ('ocupado', 'tareas', 'estudio', 'trabajo', 'otra_actividad'));
