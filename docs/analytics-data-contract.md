# Contrato de datos de Analítica

## HECHO

- La vista lee `projects` filtrado por `user_id` del usuario autenticado y, en una segunda consulta, `tareas` de esos IDs de proyecto. No consulta títulos, descripciones ni notas de otros usuarios.
- La carga semanal suma `tareas.duracion` por el día de `fecha_inicio`, normalizado a `America/Caracas` y de lunes a domingo.
- El avance se deriva de `tareas.completado / total de tareas` por proyecto. Un proyecto sin tareas no se presenta como progreso real.
- Prioridades usa `projects.prioridad` y entregas próximas usa `projects.fecha_limite`.
- El DTO serializable contiene período, resumen, series, disponibilidad, mensajes de datos incompletos, fuente y fecha de cálculo.

## INFERENCIA

- El contrato de aplicación trata `tareas.id_proyecto -> projects.id -> projects.user_id` como la relación de propiedad. Las consultas y la migración la usan explícitamente.
- El catálogo de migraciones local no contiene el DDL original de `projects` ni de `tareas`, por lo que no se pudo confirmar una restricción FK remota desde este checkout.

## DESCONOCIDO

- No hay historial verificable de finalización anterior a `completed_at`; por eso no se muestran tareas completadas en el tiempo, rachas ni adherencia al calendario.
- No existe todavía una UI que guarde disponibilidad ni sesiones reales de estudio.
- No hay acceso autorizado a n8n ni a la base remota para comprobar que la migración está aplicada o que n8n interpreta `contexto`.

## Métricas futuras y privacidad

La migración local añade `tareas.completed_at` y `calendar_availability`. Las tareas ya completadas permanecen con fecha nula; un trigger registra solo cambios posteriores a la migración. `calendar_availability` tiene una fila por usuario y políticas RLS de propietario. No se añaden sesiones reales de estudio hasta definir la experiencia, retención y consentimiento.

Taxonomía propuesta (sin instrumentación externa):

- `task_created`
- `task_completed`
- `task_rescheduled`
- `calendar_availability_saved`
- `analytics_viewed`

## Verificación remota requerida

Antes de aplicar la migración, revisar en Supabase que existen `public.projects(id, user_id)` y `public.tareas(id_proyecto)`, y que no haya políticas adicionales legítimas de `tareas` con nombres distintos. Después, ejecutar `supabase test db` y probar con dos usuarios: el usuario B no puede seleccionar, insertar, actualizar ni eliminar tareas del proyecto del usuario A.
