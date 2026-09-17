# Aula — nombre provisional

Base técnica de una aplicación universitaria de aprendizaje y productividad académica, preparada para un equipo de 8 o más integrantes.

**Estado:** infraestructura inicial. Solo existe una página de presentación y un layout base. No hay funcionalidades académicas, autenticación activa ni conexiones a servicios reales.

## Stack

- Next.js 16 estable, App Router y React 19.
- TypeScript estricto, código en `src/` y alias `@/*`.
- Tailwind CSS 4, Lucide React.
- Supabase: SDK de PostgreSQL/Auth/Storage y adaptadores SSR preparados.
- Zod para validación; ESLint y Prettier para calidad.
- Node.js, npm y Git; templates y CI preparados para GitHub.

Las versiones exactas están en `package.json` y `package-lock.json`. Este último debe versionarse siempre. No se necesitan librerías de formularios en esta etapa.

## Requisitos

- Node.js 22.18 o una revisión posterior de la rama 22; versión de referencia en `.nvmrc`.
- npm 10 (entorno inicial: 10.9.3).
- Git y acceso al [repositorio del equipo](https://github.com/ingsamuell/Sistema-de-Gestion).
- No se necesita una cuenta de Supabase para ver la página inicial.

No instalar dependencias globales para ejecutar la aplicación.

## Instalación

Clona el repositorio del equipo:

```bash
git clone https://github.com/ingsamuell/Sistema-de-Gestion.git
cd Sistema-de-Gestion
npm install
```

Copia `.env.example` a `.env.local`:

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

```bash
# macOS / Linux
cp .env.example .env.local
```

En una instalación reproducible o en CI usa `npm ci`, que respeta exactamente el lockfile. No mezclar npm con otros gestores.

## Variables de entorno

Todos los valores del ejemplo están vacíos. La página inicial, lint, typecheck y build funcionan sin credenciales. Configura únicamente las variables de la integración que vayas a desarrollar y reinicia el servidor.

| Variable                        | Alcance                       | Uso posterior                                               |
| ------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Público, navegador y servidor | URL del proyecto Supabase                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público, navegador y servidor | Clave anon o publishable; nunca service role                |
| `SUPABASE_SERVICE_ROLE_KEY`     | Solo servidor, secreto        | Operaciones administrativas explícitamente autorizadas      |
| `GEMINI_API_KEY`                | Solo servidor, secreto        | Gemini                                                      |
| `N8N_WEBHOOK_URL`               | Solo servidor                 | Webhook de automatización; tratar como información sensible |
| `APP_URL`                       | Solo servidor                 | URL base; en desarrollo puede ser `http://localhost:3000`   |

Solo las variables con prefijo `NEXT_PUBLIC_` pueden aparecer en el bundle del navegador. No añadir ese prefijo a secretos ni trasladarlos a `next.config.ts`, props de componentes cliente, respuestas HTTP o logs.

Los clientes base de Supabase usan la clave pública y el contexto del usuario; **no usan service role**. La clave pública requiere políticas RLS para proteger los datos. No hay un cliente administrativo en esta base.

## Ejecutar y verificar

```bash
npm run dev
```

Abre [localhost:3000](http://localhost:3000). Para detenerlo: Ctrl+C.

| Comando                | Propósito                                               |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Desarrollo con recarga                                  |
| `npm run build`        | Build de producción                                     |
| `npm run start`        | Servir un build existente                               |
| `npm run lint`         | ESLint, sin advertencias                                |
| `npm run typecheck`    | Generar tipos de rutas y comprobar TypeScript sin build |
| `npm run format`       | Aplicar Prettier                                        |
| `npm run format:check` | Comprobar formato sin editar                            |

`typecheck` ejecuta `next typegen && tsc --noEmit`: genera únicamente los tipos de rutas necesarios para funcionar también tras un clon limpio.

## Estructura

```text
src/
  app/                 Rutas, layouts, composición; grupos (auth), (dashboard), api
  components/          ui, layout, shared
  features/            Dominios funcionales independientes
  lib/                 supabase, validation, utils
  services/            ai, automation, external
  hooks/               Hooks realmente compartidos
  types/               Tipos globales compartidos
  config/              Configuración general
  constants/           Constantes globales
supabase/
  migrations/          Historial reproducible de cambios SQL, aún vacío
  seed/                Datos de desarrollo futuros, aún vacío
docs/                  Guías del equipo
.github/               CI y templates de colaboración
```

Las 13 features están reservadas con `.gitkeep`, sin lógica ni subcarpetas artificiales. Retira el `.gitkeep` cuando agregues contenido real.

## Flujo Git

`main` debe ser estable. Cada tarea se desarrolla en una rama `feature/*`, `fix/*`, `docs/*` o `refactor/*` y se integra mediante Pull Request revisado. Los commits siguen Conventional Commits.

El workflow de GitHub Actions ejecuta instalación reproducible, formato, lint, typecheck y build. Un administrador deberá activar las reglas de protección de `main` en GitHub; los archivos locales no activan esas reglas automáticamente.

## Documentación

- [Arquitectura y límites de seguridad](docs/architecture.md).
- [GitHub Flow, commits y Pull Requests](docs/git-workflow.md).
- [Guía de incorporación y desarrollo](docs/development-guide.md).
- [Convenciones y estrategia de pruebas](docs/project-conventions.md).

## Pendiente de decisión del equipo

Nombre definitivo, permisos de colaboradores, responsables por módulo, modelo de datos normalizado, políticas RLS, método de autenticación, diseños de Google Stitch, despliegue y cuentas de servicios externos.

No se implementaron login, dashboards, tareas, calendarios, IA, workflows, gamificación ni tablas definitivas.

## Referencias oficiales

- [Next.js: instalación](https://nextjs.org/docs/app/getting-started/installation).
- [Supabase: clientes SSR para Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).
