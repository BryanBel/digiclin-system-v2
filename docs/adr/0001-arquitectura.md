# ADR 0001 — Arquitectura de DigiClin v3

- **Estado:** aceptada
- **Fecha:** 2026-09-29

## Contexto

DigiClin v2 (Express + Astro, JavaScript) llegó a producción como MVP de citas, pero la
revisión del 29-sep encontró fallos estructurales:

- archivos médicos en disco efímero y servidos sin autenticación;
- pacientes y usuarios enlazados solo por email;
- dashboards que no cargan en producción;
- sin migraciones de base de datos;
- autorización dispersa en cada ruta.

El objetivo nuevo es un gestor para una clínica real con:

- historia clínica única por paciente;
- tres portales (administración, médico y paciente);
- crecimiento previsto: más módulos, interoperabilidad, quizá varias clínicas y una app móvil.

## Decisión

Monorepo pnpm con la API y la web **separadas en código y unidas en el despliegue**:

| Paquete           | Tecnología                                                 |
| ----------------- | ---------------------------------------------------------- |
| `apps/api`        | NestJS 12 (ESM), TypeScript 6, Drizzle ORM, PostgreSQL     |
| `apps/web`        | Astro 7 SSR, islas React con shadcn/ui (Radix), Tailwind 4 |
| `packages/shared` | Schemas Zod 4 y enums del dominio, usados por los dos      |

- **Mismo origen siempre:**
  - En desarrollo, Vite reenvía `/api` a Nest.
  - En producción, Nest sirve `/api/*` y monta el handler de Astro (`@astrojs/node`, modo `middleware`) para el resto, en un solo proceso (`apps/api/src/web.ts`).
  - Así la cookie de sesión puede ser `SameSite=Lax`, sin CORS.
- **Contrato tipado:**
  - Nest genera OpenAPI a partir de los schemas Zod (`apps/api/openapi.json`, versionado).
  - La web genera sus tipos con `openapi-typescript` y consume la API con `openapi-fetch`.
  - La CI falla si el contrato no está al día.
- **Tests** con Vitest en todo el monorepo:
  - La API se prueba contra **PGlite** (Postgres en memoria), sin Docker y sin tocar Neon.
- **Calidad:** `oxlint` para el lint, Prettier para el formato y `astro check` para las páginas.

## Por qué NestJS y no otra opción

- **Astro full-stack** (una sola app con Actions): era la opción más simple. Se descartó porque la lógica quedaría atada a la web; una app móvil, una API FHIR para laboratorios o trabajos en segundo plano la necesitan independiente.
- **Hono:** liviano y con buen tipado, pero su ventaja principal (edge/serverless) no aplica a un proceso Node persistente. Habría que construir a mano lo que Nest ya trae.
- **NestJS:** sus guards e interceptors resuelven las preocupaciones transversales de un sistema clínico:
  - autorización por relación de atención;
  - auditoría de cada lectura clínica.

  Suma a eso OpenAPI, tareas programadas, rate limiting y una estructura estándar para cuando haya más desarrolladores. El costo es más código de estructura.

## Hechos verificados al montar la fase 1

Estos datos se comprobaron en el registro de npm y en las dependencias instaladas el 29-sep-2026:

- **Nest 12 es ESM** (`"type": "module"`) y su plantilla oficial usa Vitest y `oxlint`. La API sigue esa plantilla (`module: nodenext`, imports relativos con `.js`).
- **`nestjs-zod` 5.5 solo declara soporte para Nest 10–11.** Se usa un puente propio en `apps/api/src/common/zod.ts`: un `ZodValidationPipe` y `toOpenApi()` sobre `z.toJSONSchema()`, nativo de Zod 4.
- **TypeScript 7** (compilador nativo) no es compatible todavía con `@nestjs/swagger` (TS ≤ 6) ni con `typescript-eslint` (TS < 6.1). Se fija **TypeScript 6**.
- **Vitest** emite la metadata de decoradores que necesita la inyección de dependencias de Nest, sin plugins adicionales. Se probó con una inyección por tipo.
- **Orden de parsers en Nest:** Nest registra sus parsers de cuerpo en `init()`. Por eso el handler de Astro, que se monta antes, recibe el cuerpo sin consumir.
- **Variables de Astro:** en `astro:env`, las variables `public` se incrustan al compilar. `API_INTERNAL_URL` se declara `secret` para que se lea en runtime (Render asigna el puerto al arrancar).
- **Dependencias de shadcn:** shadcn 4 usa el paquete `cn` (mantenido por shadcn, sin dependencias ni scripts de instalación) en lugar de `clsx` + `tailwind-merge`.

## Consecuencias

- El código de la v2 no se reutiliza. Queda en el tag `v2-final` y sigue en producción hasta que la v3 la reemplace.
- Un cambio en `packages/shared` requiere reiniciar `pnpm dev` de la API (el watcher de Nest no observa `node_modules`).
- Separar la API y la web en dos servicios más adelante no requiere reescribir código: basta con desactivar `SERVE_WEB` y apuntar el proxy.
