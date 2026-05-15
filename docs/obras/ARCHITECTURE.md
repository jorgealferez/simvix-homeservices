# Simvix Obras — Arquitectura

Módulo `/obras` añadido sobre la web actual de servicios del hogar. Coexisten
sin solaparse. Objetivo: orquestar con IA un proyecto de obra desde la primera
conversación con el cliente hasta el paquete presentado al ayuntamiento.

## Vista en una imagen

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Cliente / Estudio                          │
│                                    │                                    │
│        UI Next.js (App Router) — /obras                                 │
│        ┌───────────┐  ┌────────────┐  ┌────────────┐                    │
│        │  Index    │  │  Nuevo     │  │  Detalle   │                    │
│        │ proyectos │  │  proyecto  │  │  proyecto  │                    │
│        └─────┬─────┘  └─────┬──────┘  └─────┬──────┘                    │
│              │              │               │                           │
│              ▼              ▼               ▼                           │
│        ┌────────────────────────────────────────────────┐               │
│        │  API routes /api/obras/...                     │               │
│        └───────────┬──────────────────────┬─────────────┘               │
│                    │                      │                             │
│         ┌──────────▼──────────┐  ┌────────▼────────┐                    │
│         │   Orchestrator      │  │   PDF Builder   │                    │
│         │  (src/lib/ai/...)   │  │ (src/lib/pdf/.. │                    │
│         └──────────┬──────────┘  └────────┬────────┘                    │
│                    │                      │                             │
│            ┌───────▼────────┐             │                             │
│            │  11 Agents     │             │                             │
│            │  (1 per phase) │             │                             │
│            └───────┬────────┘             │                             │
│                    │                      │                             │
│           ┌────────▼─────────┐            │                             │
│           │  Anthropic API   │            │                             │
│           │   (Claude)       │            │                             │
│           └──────────────────┘            │                             │
│                                            │                             │
│                ┌──────────────────────────▼──────────────┐              │
│                │  Prisma + SQLite (dev) / Postgres (prod) │              │
│                │  Client / Project / Phase / Document /   │              │
│                │  BudgetItem / Drawing / TaskRun /        │              │
│                │  Submission / ProjectEvent / ...         │              │
│                └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
```

## Stack

- **Next.js 15** (App Router, server components por defecto).
- **TypeScript** estricto.
- **Tailwind CSS** ya configurado en el repo.
- **Prisma** con `sqlite` por defecto, intercambiable a `postgresql` cambiando
  `provider` + `DATABASE_URL`. Los enums se modelan como `String` + uniones TS
  (`src/lib/obras/enums.ts`) para portabilidad entre providers.
- **Anthropic Claude** (`@anthropic-ai/sdk`). Modelo por defecto
  `claude-opus-4-7`. Sin API key, el sistema cae automáticamente a un modo
  *mock* determinista (útil para CI y desarrollo offline).
- **pdf-lib** para generar PDFs sin dependencias nativas.
- **zod** para validación de payloads.

## Patrón “Agente”

Un agente es un objeto que cumple la interfaz `Agent` (en
`src/lib/ai/agents/base.ts`). Cada agente:

1. Tiene un `name` estable, una `phase` a la que sirve y opcionalmente
   `emitsDocument` (un `DocumentType`).
2. Construye un `systemPrompt` y los `messages` del turno actual.
3. Opcionalmente implementa `postProcess` para extraer JSON, persistir
   `BudgetItem`, etc.

`runAgent` se encarga de:

- Crear un `TaskRun` con estado RUNNING.
- Llamar a Claude (o al mock).
- Persistir el documento generado en `Document` (versionado).
- Acumular tokens y coste en `Project`.
- Marcar el `TaskRun` como SUCCEEDED / FAILED.

## El Orquestador

`src/lib/ai/orchestrator.ts` expone:

- `runPhase(projectId, phase, userInput?)`: ejecuta el agente correspondiente
  a una fase y avanza el proyecto.
- `runAllPendingPhases(projectId)`: recorre las fases en orden, parando si
  alguna falla o requiere revisión humana.

## Las 11 fases

```
INTAKE → NORMATIVA → ANTEPROYECTO → MEMORIA_TECNICA → MEDICIONES →
PRESUPUESTO → PLANOS → ESS → GESTION_RESIDUOS → DOC_ADMINISTRATIVA →
PRESENTACION
```

Cada fase produce uno o más `DocumentType` y consume los previos (ver
`src/lib/obras/phases.ts`).

## Cómo evolucionarlo

- **Añadir agente nuevo**: crear `src/lib/ai/agents/mi-agente.ts`, registrar en
  `registry.ts`, vincular a una `PhaseType` (o añadir una fase nueva en
  `phases.ts` y en el enum `PHASE_TYPES`).
- **Cambiar el modelo**: setear `OBRAS_DEFAULT_MODEL` en `.env`. Para un agente
  concreto, setear `preferredModel`.
- **Añadir un nuevo ayuntamiento**: añadir entrada en
  `src/lib/obras/ayuntamientos.ts` y rebuild.
- **Generar un nuevo tipo de documento**: añadir a `DOCUMENT_TYPES` en
  `enums.ts`, y opcionalmente al `DOC_ORDER` de `src/lib/pdf/package.ts` para
  incluirlo en el paquete final.

## Persistencia

Tablas principales con índices apropiados. El esquema está documentado en
`prisma/schema.prisma`. En producción se recomienda migrar a Postgres con
`pgvector` activado (para futuros paquetes con RAG, ver ROADMAP P11).

## Auditoría y trazabilidad

Cada llamada a Claude crea un `TaskRun` con: input, output, tokens, coste
estimado, duración. Cada cambio relevante en un proyecto crea un
`ProjectEvent`. Esto da una pista de auditoría completa.

## Seguridad

- No se ha incorporado auth todavía (planificado en P02). En producción NO
  exponer `/obras` y `/api/obras/*` sin authn/authz.
- Los datos personales se almacenan en claro en SQLite/Postgres. P01 contempla
  encriptación de campos sensibles.
- El cliente Anthropic se inicializa con `ANTHROPIC_API_KEY` en el servidor.
  Nunca se envía al navegador.

## Costes

El cliente Anthropic estima el coste por llamada usando una tabla local de
tarifas (no vinculante). El total acumulado por proyecto se muestra en la UI.
