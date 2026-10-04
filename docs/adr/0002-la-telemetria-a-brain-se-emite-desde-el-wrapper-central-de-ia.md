# ADR 0002 — La telemetría a Brain se emite desde el wrapper central de IA con identidad por llamador

- **Estado:** aceptado
- **Fecha:** 2026-10-04
- **Fase:** 1
- **Decide:** Constructor, auditado por el Critico

## Contexto

Brain (`simvix-brain`, Fase 11, PR #21) centraliza las automatizaciones con IA de todos los servicios:
cada servicio empuja sus ejecuciones a `POST $BRAIN_URL/api/ia/ejecuciones`. Este repositorio ya mide
tokens, coste, duracion y error por llamada en `TaskRun`, `Conversation` y `DrawingAnalysis`, pero cada
consumidor lo persiste a su manera y hay llamadores (inspecciones, SVG) que no guardan todo. Todas las
llamadas reales pasan por `callAi`/`callAiStream` en `src/lib/ai/client.ts`, que ademas es quien conoce
el modelo efectivo, el `usage` final y el coste calculado. Decisiones del usuario: informar desde el
wrapper central, no informar en mock, sin latidos (no hay scheduler), cliente que nunca rompe al
servicio, diff pequeño.

## Decision

`AiCallParams` acepta un campo opcional `brain: { automatizacion, tipo?, nombre?, url? }` y el wrapper
informa a Brain al terminar cada llamada en modo real (ok, refusal como `error`, o excepcion), con
`proveedor: anthropic`, modelo, `tokens_entrada` (entrada + cache leida + cache creada),
`tokens_salida`, `coste_usd` ya calculado, `duracion_ms` y `error`. Cada llamador declara su identidad:
agentes de obra (`automatizacion` = nombre del agente, `tipo: agente`), chat por agente
(`chat-<agente>`, `tipo: asistente`, `url` del panel de la obra), `analisis-planos`, `inspeccion-obra`,
`planos-svg`. Si un llamador futuro no declara nada, se informa como `obras-ia` (`tarea`), para que
ninguna llamada quede fuera. El cliente `src/lib/brain.ts` lee `BRAIN_URL`/`BRAIN_TOKEN` en cada
llamada, usa el `fetch` global con timeout de 5 s, nunca lanza y nunca registra el token. En modo mock
el wrapper devuelve antes de llegar al reporte.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Informar donde se consolida `TaskRun` (`runAgent`) | Deja fuera el chat, los planos, las inspecciones y el SVG, que no pasan por `runAgent` |
| Envolver al cliente de Anthropic (`messages.stream`) | El wrapper ya es el unico punto de paso y ademas calcula el coste; bajar un nivel pierde el `coste_usd` propio |
| Deducir la automatizacion del `system` prompt | Fragil y opaco; un identificador declarado por el llamador es estable y auditable |
| `countTokens` tambien informa | No es una ejecucion: no genera, no tiene coste ni `usage` de salida; añadiria ruido |

## Consecuencias

Toda llamada real queda visible en Brain con una linea por llamador. Coste: un `fetch` asincrono por
llamada (no bloquea; la promesa se descarta con `void`). Limite conocido: si el cliente del chat aborta
el stream, el generador termina por `return()` y esa llamada no se informa (el repositorio ya persiste
lo generado). La tabla de precios sigue duplicada entre servicios: Brain recibe el `coste_usd` local;
unificarla es trabajo de otra fase. `cada_segundos` no se usa porque no hay tareas programadas.

## Verificacion

`npm run test:brain` (cliente inocuo, cuerpo del contrato, `brainRunFor`); metrica
`ia_llamadores_sin_automatizacion` = 0 en `docs/benchmarks/fase_1.json`; `node:typecheck` y `node:lint`
en PASS.
