# Guía de desarrollo

## Incorporación

Pide acceso al [repositorio del equipo](https://github.com/ingsamuell/Sistema-de-Gestion) y una Issue. Instala Node.js 22.18+ de la rama 22, npm 10 y Git. `.nvmrc` indica la versión de referencia; un gestor de versiones es opcional.

```bash
git clone https://github.com/ingsamuell/Sistema-de-Gestion.git
cd Sistema-de-Gestion
npm install
```

Copia `.env.example` a `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

En macOS/Linux: `cp .env.example .env.local`.

Configura las variables autorizadas cuando trabajes en una integración. Para la base inicial puedes dejarlas todas vacías. Nunca compartas claves por Git, Issues o PR.

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La página debe mostrar “Un espacio para aprender y avanzar.”. Esto verifica la base visual; no verifica una conexión a Supabase.

Si el puerto está ocupado, usa `npm run dev -- --port 3001` y abre ese puerto. Detén con Ctrl+C. Después de cambiar `.env.local`, reinicia el servidor. En PowerShell, si la política local bloquea `npm.ps1`, utiliza `npm.cmd` sin modificar políticas globales.

## Una tarea completa

Con el árbol de trabajo limpio:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/project-cards
```

Desarrolla dentro de la feature correspondiente. Si hay cambios locales pendientes antes de cambiar de rama, guárdalos en su rama; no descartarlos.

```bash
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run build
```

Typecheck funciona sin un build previo: `next typegen` genera los tipos de rutas y `tsc --noEmit` comprueba el código. Build no sustituye lint. Comprueba también el comportamiento visible con `npm run dev`.

Para probar el build:

```bash
npm run start
```

Ejecuta start después de build, y evita dos servidores en el mismo puerto.

Antes de publicar tu rama:

```bash
git status
git diff
git add <ARCHIVOS_DE_LA_TAREA>
git diff --cached
git commit -m "feat: add project card component"
git push -u origin feature/project-cards
```

Abre un Pull Request desde esa rama hacia `main`, completa el template y vincula la Issue, por ejemplo `Closes #12`. Pide revisión, espera CI y resuelve comentarios antes de integrar.

Los comandos con `<...>` son placeholders: deben sustituirse, no copiarse literalmente.

## Instalación reproducible

Usa `npm ci` para reinstalar exactamente desde el lockfile, especialmente en CI. `npm install` se usa al incorporar o cambiar dependencias. No editar manualmente el lockfile ni instalar todos los SDK futuros.

## Desarrollo por dominio

Consulta [arquitectura](architecture.md) y [convenciones](project-conventions.md). Crea únicamente los archivos que necesite tu tarea. Un formulario sencillo puede empezar con controles nativos y Zod en servidor; añadir una librería solo cuando haya una necesidad demostrable.

Los clientes de Supabase se importan desde `@/lib/supabase/client` en navegador y `@/lib/supabase/server` en servidor. Todavía no existe refresco de sesión ni control de acceso: deben implementarse y probarse antes de activar autenticación.

No ejecutar migraciones sobre un entorno compartido sin coordinación. El procedimiento de base de datos local se completará cuando se acuerde el modelo y se incorpore Supabase CLI.

## Validación y problemas comunes

- Error de configuración de Supabase: completar las dos variables públicas antes de invocar un cliente; la página inicial no lo necesita.
- Error por `server-only`: un componente cliente está importando código exclusivo de servidor; mover la operación al backend.
- Error al instalar: confirmar versión de Node/npm y acceso a npm; no usar `--force` ni `--legacy-peer-deps` para esconder incompatibilidades.
- Bloqueos en Windows/OneDrive: cerrar el proceso Next que use la carpeta antes de reconstruir; no eliminar archivos de otros procesos.
- Checks de formato: ejecutar `npm run format` y revisar el diff.

La CI no usa cuentas reales ni credenciales. Las comprobaciones actuales son estáticas y de compilación; las pruebas funcionales se añadirán con las primeras features.
