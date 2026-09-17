# Flujo Git del equipo

## GitHub Flow

`main` representa siempre una versión estable. Nadie desarrolla directamente en ella. Cada tarea tiene una Issue, una rama corta y un Pull Request revisado.

| Trabajo         | Rama                           | Ejemplo                                                                                |
| --------------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| Funcionalidad   | `feature/nombre-funcionalidad` | `feature/login`, `feature/project-cards`, `feature/project-creation`, `feature/kanban` |
| Corrección      | `fix/nombre-error`             | `fix/login-validation`                                                                 |
| Documentación   | `docs/nombre-cambio`           | `docs/database-design`                                                                 |
| Refactorización | `refactor/nombre`              | `refactor/project-service`                                                             |

El repositorio del equipo es [ingsamuell/Sistema-de-Gestion](https://github.com/ingsamuell/Sistema-de-Gestion). La preparación inicial se conserva en `feature/project-foundation`. Como excepción de arranque de un repositorio vacío, la base técnica verificada se publica inicialmente en `main`; a partir de ahí, toda tarea requiere rama y PR. La publicación inicial fue solicitada por el responsable del proyecto. No hay despliegue automático configurado.

## Trabajo diario

1. Asignar la Issue y acordar criterios de aceptación, dominio y dependencias.
2. Actualizar `main` con `git pull --ff-only origin main`.
3. Crear una rama desde ella.
4. Desarrollar cambios pequeños y relacionados con la tarea.
5. Ejecutar formato, lint, typecheck y build.
6. Revisar `git diff` y preparar archivos explícitamente con `git add`.
7. Crear commits claros, hacer push de la rama y abrir PR.
8. Completar el template, enlazar la Issue y pedir revisión a otra persona.
9. Resolver observaciones y checks; integrar mediante squash merge con título Conventional Commit.
10. Eliminar la rama ya integrada y actualizar el entorno local.

Usar Draft PR temprano si hay trabajo compartido. No dejar ramas aisladas durante semanas. Los cambios de `package.json`, lockfile, layout global y configuración se coordinan en la Issue para reducir conflictos entre 8+ integrantes.

Si `main` avanzó, incorporarlo a la rama con `git fetch origin` y `git merge origin/main`. Resolver conflictos entendiendo ambos cambios y repetir verificaciones. No utilizar force push en ramas compartidas ni sobrescribir el trabajo de otra persona.

## Conventional Commits

Formato: `tipo: descripción concreta`. Un scope opcional puede indicar el dominio: `feat(projects): add project card`.

```text
feat: add project card component
fix: correct login validation
docs: update project architecture
refactor: simplify project service
style: format dashboard components
test: add project service tests
chore: configure prettier
```

Evitar mensajes como “cambios”, “prueba”, “cosas” o “update”. Mantener una sola intención por commit. Los commits y nombres de código usan preferiblemente inglés; la documentación del equipo está en español.

## Protección de main en GitHub

Pendiente de activar por un administrador en el repositorio de GitHub:

- Pull Request obligatorio y al menos una aprobación de otra persona.
- Checks obligatorios del workflow `CI`, job `quality`.
- Resolver conversaciones y descartar aprobaciones cuando haya cambios sustanciales.
- Bloquear force pushes y borrado de `main`.
- Elegir permisos de colaboradores y política de integración del equipo.

El workflow se ejecuta en cada PR y push a `main`, con permisos de lectura y sin secretos. Tener el YAML no equivale a haber activado reglas de protección ni a haber ejecutado CI en GitHub.

CODEOWNERS queda pendiente hasta contar con usuarios de GitHub y responsables acordados. No asignar propietarios ficticios.

## Lockfile y secretos

Versionar siempre `package-lock.json`. Modificar dependencias con npm y revisar ambos archivos. Resolver conflictos de manifiesto primero y regenerar el lockfile con npm; no borrarlo arbitrariamente.

Revisar `git diff --cached` antes de cada commit. `.gitignore` no elimina secretos que ya estuvieran versionados. No subir archivos de entorno, tokens, bases de datos ni información de estudiantes.
