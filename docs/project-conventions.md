# Convenciones del proyecto

## Nombres

| Elemento                        | Convención               | Ejemplo                              |
| ------------------------------- | ------------------------ | ------------------------------------ |
| Componentes React               | PascalCase               | `ProjectCard.tsx`                    |
| Hooks                           | useNombre, camelCase     | `useProjects.ts`                     |
| Funciones y variables           | camelCase                | `createProject`                      |
| Tipos e interfaces              | PascalCase               | `Project`, `CreateProjectInput`      |
| Variables de entorno            | UPPER_SNAKE_CASE         | `GEMINI_API_KEY`                     |
| Rutas y directorios de features | kebab-case               | `/study-sessions`                    |
| Archivos especiales de Next.js  | Convención del framework | `page.tsx`, `layout.tsx`, `route.ts` |

Usar nombres de código en inglés. Evitar abreviaturas ambiguas y tipos `any` sin justificación.

## Importaciones

Usar alias para módulos de `src`:

```tsx
import { AppHeader } from '@/components/layout/AppHeader';
```

Evitar cadenas como `../../../../components`. Mantener las dependencias de proveedores separadas de las importaciones internas y usar `import type` cuando corresponda. No crear archivos índice para exportar cada directorio vacío.

## Código y organización

- TypeScript estricto. Tipos de dominio junto a su feature; `src/types` solo para tipos realmente compartidos.
- Componentes pequeños con una responsabilidad. Dividir cuando leer o cambiar un archivo requiera entender varias responsabilidades.
- No colocar lógica de negocio en componentes genéricos ni llenar `lib/utils` de funciones sin relación.
- Preferir composición y funciones sencillas antes de abstracciones preventivas.
- Mantener errores útiles, sin secretos ni detalles internos expuestos al usuario.
- Inputs accesibles, labels, estados de error y navegación por teclado cuando existan formularios.
- Validar con Zod en el límite del servidor; la validación cliente no sustituye esa obligación.
- Toda consulta o mutación privada debe verificar identidad y permisos. Añadir RLS antes de habilitar tablas.
- Las decisiones que cambien contratos entre features se explican en la Issue/PR.

## Formato y calidad

Prettier define dos espacios, comillas simples y punto y coma. `.editorconfig` y `.gitattributes` mantienen UTF-8 y LF entre sistemas operativos. ESLint utiliza las reglas oficiales de Next.js y TypeScript; `eslint-config-prettier` evita conflictos de formato.

**Compatibilidad pendiente:** ESLint 9.39.5 está fijado porque los plugins de importaciones, accesibilidad y React incluidos por el preset de Next.js 16.3.5 todavía declaran compatibilidad hasta ESLint 9. npm avisa que esa versión de ESLint está fuera de soporte. Migrar a ESLint 10 cuando el preset completo lo soporte; no usar overrides ni --force para ocultar conflictos. TypeScript 5 se conserva como versión compatible del entorno inicial.

Antes del PR: `format:check`, `lint`, `typecheck`, `build` y una comprobación manual de lo cambiado. No deshabilitar reglas para ocultar errores sin explicación.

No se instalaron clsx ni tailwind-merge porque aún no hay composición dinámica de clases que los necesite.

## Estrategia futura de pruebas

No hay runner ni tests ficticios en esta base. Incorporar herramientas cuando exista comportamiento real:

| Nivel       | Ubicación propuesta                                  | Qué verificar                                                         |
| ----------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| Unitarias   | Junto al código, `*.test.ts(x)` dentro de la feature | Esquemas, cálculos y reglas de dominio                                |
| Integración | `tests/integration/`, al necesitarlo                 | Servicios, endpoints, autorización y políticas RLS con datos aislados |
| E2E         | `tests/e2e/`, al existir flujos                      | Registro/acceso, creación de proyectos y sesiones de estudio          |

Evaluar Vitest para unitarias/integración y Playwright para E2E al incorporarlas; no están instalados. Incluir casos de errores, usuario ajeno y sesión expirada. No probar contra producción ni enviar datos reales a Gemini o n8n. Aislar proveedores externos con dobles de prueba y usar seeds reproducibles.

Añadir scripts y jobs de CI en el mismo PR que incorpore la herramienta y sus primeras pruebas útiles.

## Cambios visuales y dependencias

La interfaz actual es un layout mínimo. Google Stitch se utilizará como referencia al implementar las pantallas acordadas. Conservar diseños existentes y justificar cambios públicos.

Toda dependencia nueva debe resolver un problema actual. No añadir gráficos, calendario, drag and drop, PDF, editores, SDK de Gemini ni SDK de n8n de forma preventiva.
