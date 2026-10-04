# OBJETIVO — carta de meta de simvix-homeservices

estado: en-curso

Esta carta dice **de donde parte** el repositorio `simvix-homeservices` y **a donde tiene que llegar**. Es la
referencia contra la que se mide todo el trabajo y la razon por la que el agente no para hasta
`estado: alcanzado`. Una carta por repositorio, nombrada por repositorio; lo que pertenezca a otro
repositorio va en su `OBJETIVO.<otro>.md`.

Estados: `sin-encuadrar` (recien instalada: la primera tarea es el encuadre) · `en-curso` ·
`alcanzado` (solo con todos los criterios medidos) · `pausado` (solo lo escribe una persona).

Reglas: los criterios se escriben con su medida (`— medida: <como se mide> — objetivo: <valor>`); las
fases van en orden, una fase = un pull request con squash merge; se pueden anadir fases al final,
nunca renumerar; una fase se marca `[x]` con la referencia de su PR o commit; un criterio que este
entorno no puede medir se anota `NO VERIFICADO (<motivo>)` y sigue pendiente; uno que el usuario saca
del alcance se anota `FUERA DE ALCANCE por decision del usuario (<fecha>)` y deja de contar. Las
suposiciones se escriben aqui, no se preguntan.

## Inicio

Encuadre del 2026-10-04 sobre `main` en `d36661a` (merge del PR #4; historial de 1 commit).

- **Stack**: Next.js 15.3 (App Router) + React 18 + TypeScript 5 estricto; Prisma 5.22 con SQLite por
  defecto (Postgres opcional por `DATABASE_URL`); Tailwind 3; Auth.js v5 beta; `@anthropic-ai/sdk`
  0.96; zod. Node `>=20.19` (entorno: 22.22, npm 10.9). Despliegue en Railway con NIXPACKS
  (`railway.toml`, `npm run start`), servicio `simvix-homeservices` del proyecto «Servicios Domesticos
  Simvix».
- **Tamano**: 164 ficheros `.ts/.tsx` en `src/`, 42 rutas API, 37 modelos Prisma, 11 agentes de obra
  (`intake`, `normativa`, `anteproyecto`, `memoria-tecnica`, `mediciones`, `presupuesto`, `planos`,
  `ess`, `residuos`, `doc-administrativa`, `ayuntamiento`) con chat SSE por agente
  (`POST /api/obras/[id]/chat`), analisis multimodal de planos, inspecciones de obra y generacion SVG.
- **IA**: wrapper central `src/lib/ai/client.ts` (`callAi`, `callAiStream`, `countTokens`) con tabla de
  precios propia, prompt caching y modo `mock` (`OBRAS_AI_MODE=mock` o sin `ANTHROPIC_API_KEY`). Telemetria
  propia en `TaskRun`, `Conversation`, `DrawingAnalysis` (tokens, `costUsd`, `durationMs`, `error`), pero
  **nada sale del servicio**: no hay catalogo comun de automatizaciones ni avisos.
- **Lo que funciona hoy (medido en la pasada de referencia del gauntlet, ver `docs/benchmarks/fase_0.json`)**:
  `npm run lint` PASS; `npm run build` PASS; 1 fichero de tests (`src/lib/cte/index.test.ts`, sin
  framework, se ejecuta con `tsx`). `node:typecheck` y `node:test` quedaron en SKIP porque los scripts se
  llaman `type-check` y `test:cte`, no `typecheck`/`test` (ADR 0001).
- **CI**: `.github/workflows/ci.yml` (npm install, `npm audit --audit-level=high`, `type-check`, `lint`,
  `build` con `OBRAS_AI_MODE=mock`). No ejecuta tests.
- **Sin scheduler**: housekeeping manual (`obras:housekeeping`); no hay crons ni colas.
- **Deuda visible**: README dice «Next.js 14» (el manifiesto es 15); la tabla de precios de IA esta
  duplicada respecto a otros servicios; sin runner de tests; `process.env` disperso por 25 ficheros;
  arranca en mock si no se define el proveedor.

## Meta

El proyecto esta terminado cuando toda llamada a la IA de Simvix Obras en modo real (11 agentes, chats
por agente, analisis de planos, inspecciones, SVG) queda informada a Brain (`simvix-brain`, Fase 11,
PR #21) con proveedor, modelo, tokens, coste, duracion y estado, sin que el cliente pueda romper el
servicio ni filtrar el token; el repositorio tiene el Loop Engineering instalado con un gauntlet `full`
que ejecuta de verdad tipos, lint, tests y build; y la deuda visible de la base que afecta a la
verificacion (tests fuera de CI, README desalineado) esta cerrada. Suposicion revisable: la meta de
producto del modulo /obras (roadmap en `docs/obras/ROADMAP.md`) queda fuera de esta carta hasta que el
usuario la incorpore.

## Criterios de salida

- [x] Loop instalado y gauntlet honesto — medida: `bin/gauntlet -p full` ejecuta `node:typecheck` y
  `node:test` (no SKIP) — objetivo: 0 FAIL con ambas puertas en PASS (medido 2026-10-04: 10 PASS, 0 FAIL,
  `node:typecheck` 19.0 s y `node:test` 1.7 s en PASS; `docs/benchmarks/fase_0.json`, #5)
- [ ] Cliente de Brain inocuo — medida: `npm run test:brain` (sin `BRAIN_URL`/`BRAIN_TOKEN` no hace ninguna
  peticion; con `fetch` inyectado envia el cuerpo del contrato; un fallo de red no lanza; el token no
  aparece en logs) — objetivo: todas las aserciones PASS
- [ ] Cobertura de llamadores — medida: llamadores de `callAi`/`callAiStream` en `src/` fuera del wrapper
  que no declaran `automatizacion` (`grep`) — objetivo: 0
- [ ] Variables documentadas — medida: `BRAIN_URL` y `BRAIN_TOKEN` presentes en `.env.example`, `README.md`
  y `DEPLOY.md` — objetivo: 3 de 3 ficheros
- [ ] Ejecuciones visibles en Brain — medida: ejecuciones del conector `simvix-homeservices` en el panel
  de Brain tras configurar las variables en Railway — objetivo: >= 1 ejecucion recibida.
  NO VERIFICADO (este entorno no tiene credenciales de Railway ni token de Brain)
- [ ] Tests en CI — medida: `.github/workflows/ci.yml` ejecuta `npm test` — objetivo: paso presente

## Fases

- [x] Fase 0 — Encuadre (#5, squash `ae40418`): loop instalado, esta carta rellena desde la base real,
  alias `typecheck`/`test` en `package.json` para que el gauntlet ejecute tipos y tests (ADR 0001),
  ledger sembrado, gauntlet en VERDE. Acerca el criterio 1.
- [ ] Fase 1 — Conectar con Brain: `src/lib/brain.ts`, telemetria desde `callAi`/`callAiStream`
  (agentes, `chat-<agente>`, `analisis-planos`, inspecciones, SVG), `test:brain`, variables documentadas.
  Acerca los criterios 2, 3, 4 y 5.
- [ ] Fase 2 — Verificacion en CI y README al dia: `npm test` en `ci.yml`, README con el stack real
  (Next 15). Acerca el criterio 6.

## Calidad y proyeccion

Liston que no se negocia: gauntlet `full` en VERDE antes de cada PR; un ADR por decision de diseño en
`docs/adr/`; un benchmark medido por fase en `docs/benchmarks/fase_N.json` con sus numeros dentro del
presupuesto (`presupuesto.json`); Ratchet: un numero medido es suelo minimo para las fases
siguientes; nada de fases de relleno: cada fase acerca un criterio de salida y lo dice.

## Decisiones del usuario

- 2026-10-04 — Conectar el servicio a Brain (ref. `simvix-brain` Fase 11, PR #21): informar desde el
  wrapper central; `automatizacion` = nombre del agente de obra con `tipo: agente`; el chat por agente
  como `tipo: asistente` con `automatizacion: chat-<agente>`; analisis de planos como `analisis-planos`;
  `proveedor: anthropic`, modelo, tokens, `coste_usd` ya calculado, duracion, estado/error. En modo
  `mock` no se informa. Sin latidos (no hay scheduler). Variables `BRAIN_URL`/`BRAIN_TOKEN` leidas en
  `src/lib/brain.ts`; servicio de Railway: `simvix-homeservices`.
- 2026-10-04 — El cliente de Brain nunca rompe al servicio: sin variables no hace nada, timeout 5 s,
  errores tragados, token nunca registrado, sin dependencias nuevas (el runtime ya tiene `fetch`).
- 2026-10-04 — Diff pequeño y centrado: no se refactoriza, no se cambian modelos ni se arreglan bugs
  ajenos; lo que se vea se anota en el ledger como propuesta.
- 2026-10-04 — CI existe (GitHub Actions). Si no tiene runners o cuota, la pasada local del gauntlet es
  el unico veredicto y se declara en el PR.
