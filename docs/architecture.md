# Arquitectura

## Criterio general

Un único proyecto Next.js, organizado principalmente por features. No se necesitan microservicios, monorepo, contenedor de dependencias ni repositorios abstractos. Las rutas componen; los dominios contienen la lógica.

| Directorio              | Responsabilidad                                                          |
| ----------------------- | ------------------------------------------------------------------------ |
| `src/app`               | Rutas, layouts, Route Handlers y composición; lógica de negocio delegada |
| `src/features`          | Componentes, esquemas y lógica de cada dominio                           |
| `src/components/ui`     | Elementos visuales genéricos                                             |
| `src/components/layout` | Header, sidebar y navegación estructural                                 |
| `src/components/shared` | Componentes compartidos por varias features                              |
| `src/lib`               | Configuración y utilidades internas enfocadas                            |
| `src/services`          | Adaptadores de servicios externos                                        |
| `src/hooks`             | Hooks usados por múltiples dominios                                      |
| `src/types`             | Tipos globales realmente compartidos                                     |
| `src/config`            | Configuración general                                                    |
| `src/constants`         | Constantes globales                                                      |

`(auth)` y `(dashboard)` son grupos de rutas: sus nombres no forman parte de la URL y **no protegen rutas por sí mismos**. Actualmente están vacíos. No crear páginas duplicadas para la misma URL en distintos grupos.

## Dominios preparados

| Feature        | Alcance futuro                                |
| -------------- | --------------------------------------------- |
| auth           | Registro, acceso, cierre de sesión            |
| profile        | Perfil académico                              |
| projects       | Proyectos de aprendizaje                      |
| tasks          | Tareas y replanificación asociada             |
| calendar       | Agenda                                        |
| study-sessions | Sesiones y gestión de tiempo                  |
| study-methods  | Técnicas de estudio                           |
| feedback       | Feedback posterior a sesiones                 |
| assessments    | Microevaluaciones                             |
| analytics      | Dashboard y métricas                          |
| gamification   | Rachas y progreso lúdico                      |
| ai-assistant   | Chat contextual y recomendaciones             |
| notifications  | Preferencias y presentación de notificaciones |

El reparto de responsables y los contratos entre dominios se acuerdan en Issues. No inventar tipos globales ni tablas para anticipar decisiones académicas pendientes.

## Crecimiento de una feature

Crear directorios solo cuando exista código real que alojar:

```text
features/projects/
  components/
  hooks/
  services/
  schemas/
  types/
  utils/
```

Los servicios dentro de una feature expresan operaciones de ese dominio; `src/services/` contiene comunicación técnica con proveedores externos. Los prompts y adaptadores de IA no pertenecen a componentes visuales.

Las dependencias fluyen de `app` hacia features y de features hacia módulos compartidos. Los módulos compartidos no importan páginas ni dependen de una feature concreta. Evitar ciclos e importaciones de detalles internos de otro dominio; acordar una interfaz pequeña al aparecer esa necesidad, sin crear barrels preventivos.

Mantener código en su feature hasta que tenga consumidores reales en varias features. No concentrar el proyecto en `components/` ni crear una carpeta de utilidades indiscriminada.

## Frontera servidor / navegador

Usar Server Components por defecto. Añadir `'use client'` solo a componentes con interacción, hooks o APIs del navegador. Los módulos sensibles deben importar `server-only`. El navegador llama a Route Handlers o Server Actions; estos validan entrada, identidad y permisos antes de delegar.

No confiar en ocultar botones o rutas. Cada operación sobre datos privados debe verificar al usuario autenticado y su autorización en servidor, además de RLS.

## Supabase

- `src/lib/supabase/client.ts`: fábrica para navegador, con `createBrowserClient`.
- `src/lib/supabase/server.ts`: fábrica asíncrona por petición, con `createServerClient` y cookies de Next.js; marcada con `server-only`.
- `src/lib/supabase/env.ts`: valida solo las dos variables públicas con Zod cuando se solicita un cliente. No lee secretos.
- Ambos clientes usan la clave pública, nunca service role. No se ejecutan desde la página inicial.

**La autenticación todavía no está implementada.** Antes de activar login o rutas privadas, implementar el proxy de refresco de sesión siguiendo la documentación oficial, persistir cookies en respuestas y verificar identidad mediante `getClaims()` o `getUser()` según la necesidad. No usar `getSession()` como prueba de identidad. Los Server Components no pueden escribir cookies; el catch del adaptador solo contempla esa restricción y no sustituye al proxy.

Configurar después callbacks, cierre de sesión y pruebas de expiración. Evitar caché compartida para respuestas privadas o que contengan cookies. No existe cliente administrativo: si se necesita, deberá vivir en un módulo exclusivo de servidor con autorización explícita.

### Migraciones

No hay tablas definitivas, seeds ni proyecto remoto configurado. Las carpetas `supabase/migrations/` y `supabase/seed/` se conservan para el desarrollo posterior.

1. Discutir y normalizar el modelo académico.
2. Elegir y fijar la versión de Supabase CLI cuando empiece el trabajo de base de datos.
3. Inicializar la configuración local de Supabase y documentar Docker si se usa su entorno local.
4. Crear migraciones SQL con nombres únicos de timestamp y descripción; incluir tablas, índices, constraints y RLS en la revisión.
5. Validar la reproducción desde una base vacía local antes de aplicarlas a un entorno compartido.
6. Si se crea SQL mediante el dashboard, capturar el cambio en una migración y revisarla antes de integrarlo. Nunca dejar la estructura solamente en el dashboard.
7. No editar migraciones ya aplicadas en entornos compartidos: crear otra migración.
8. Incorporar datos de prueba no sensibles en `seed/` y configurar explícitamente su carga en el futuro `supabase/config.toml`.

Ningún comando de reset debe apuntar a producción. Aplicar migraciones al entorno compartido de forma coordinada; cada integrante no debe ejecutar cambios remotos por su cuenta.

## Integraciones previstas

### Gemini: src/services/ai/

- Llamadas exclusivamente desde servidor; nunca enviar la API key al navegador.
- Construir desde backend el contexto mínimo autorizado del usuario; no aceptar sin verificar IDs ni contexto sensible enviado por el cliente.
- Mantener prompts complejos separados de componentes visuales.
- Validar respuestas estructuradas con Zod; tratar la salida como datos no confiables.
- La IA propone; las acciones importantes requieren confirmación del usuario y nueva validación de permisos al ejecutarlas.
- RAG y documentos se diseñarán después de definir autorización y privacidad.

No hay SDK, prompts ni endpoints de IA en esta entrega.

### n8n: src/services/automation/

Se prevén recordatorios, correos, tareas programadas y automatizaciones. La aplicación se comunicará mediante endpoints/webhooks controlados desde servidor. No enviar el webhook al cliente. Definir autenticación o firma, validación, idempotencia y reintentos al implementar la integración. No hay workflows ni SDK de n8n.

### APIs externas: src/services/external/

Adaptadores específicos por proveedor cuando sean necesarios. Validar respuestas y definir timeouts, tratamiento de errores y permisos dentro de cada integración real.

## Seguridad obligatoria

- Nunca subir `.env`, `.env.local` ni valores reales; únicamente `.env.example` vacío.
- Nunca exponer service role ni la clave de Gemini. No imprimir secretos en logs.
- Validar inputs con esquemas; el frontend mejora UX, pero el backend siempre vuelve a validar.
- Configurar RLS antes de exponer tablas con datos de usuarios. Revisar también políticas de Storage si se utiliza.
- Verificar identidad y autorización en toda operación privada.
- Si un secreto se filtra, revocarlo/rotarlo; borrarlo del último commit no basta.

## Referencias

- [Next.js App Router](https://nextjs.org/docs/app).
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
