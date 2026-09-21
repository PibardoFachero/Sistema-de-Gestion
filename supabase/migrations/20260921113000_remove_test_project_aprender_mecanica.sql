-- Eliminación puntual solicitada del proyecto creado durante pruebas de Analítica.
-- La relación tareas_id_proyecto_fkey elimina automáticamente sus tareas asociadas.
delete from public.projects
where titulo = 'aprender mecanica';
