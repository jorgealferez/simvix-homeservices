# PENDIENTES — ledger de continuidad de simvix-homeservices

continuidad: activa

Este archivo es el **estado de trabajo compartido entre agentes y sesiones** del repositorio
`simvix-homeservices`, y solo de el. Lo lee el hook `Stop` de continuidad: mientras haya un item sin marcar en
`## Activo`, ningun agente puede cerrar el turno. Protocolo: skill `continuidad`.

Reglas de edicion (resumen; la version completa esta en la skill):

- **Un ledger por repositorio, nombrado por repositorio.** Aqui solo entran items cuyo cambio vive en
  `simvix-homeservices`. Si una tarea toca otro repositorio, su parte va en el `PENDIENTES.<otro>.md` de ese
  repositorio, con referencia cruzada. Nunca se crea un `PENDIENTES.md` sin nombre ni un ledger global.
- `## Activo` esta en **orden de ejecucion**. Se toma siempre el primero sin reservar.
- Un item se marca `[x]` solo con su pull request mergeado (o su entregable verificado).
- `## Esperando`: items que dependen de algo externo (CI, revision, servicio). Al mover uno aqui, el
  agente **programa un despertador** antes de cerrar el turno. Si no puede programarlo, el item no se
  mueve: se sigue trabajando.
- `## Bloqueado`: solo con `BLOQUEADO: <motivo>` y solo si el motivo es una de las causas de la seccion
  "Cuando SI hay que parar y preguntar". Es la unica forma legitima de dejar de avanzar.
- `continuidad: pausada` la escribe **una persona**, nunca un agente.
- **Antes de empezar un item se RESERVA**: se le anade `EN CURSO (<sesion>, <fecha>)` y se publica el
  ledger (commit y push) *antes* de escribir codigo. Otra sesion que vea una reserva viva se salta ese
  item y toma el siguiente sin reservar. Una reserva caduca si su rama remota no se mueve en 24 h.
- Una seccion vacia se escribe `(vacio)`; nunca se borra la seccion.

## Activo

- [ ] Conectar con Brain: telemetria de automatizaciones con IA (ref. simvix-brain Fase 11, #21) — Fase 1 de la carta EN CURSO (sesion claude 01SzUvjv, 2026-10-04)
  - [x] `src/lib/brain.ts` (BRAIN_URL/BRAIN_TOKEN, fetch con timeout 5 s, errores tragados)
  - [x] informar desde `callAi`/`callAiStream` con `automatizacion` por llamador (agentes, `chat-<agente>`, `analisis-planos`, inspecciones, SVG); no informar en mock
  - [x] `test:brain` colgado de `npm test`
  - [x] `.env.example`, `README.md`, `DEPLOY.md` con `BRAIN_URL`/`BRAIN_TOKEN`
  - [ ] PR "Conectar con Brain: telemetría de automatizaciones con IA" con veredicto real, squash merge; despues marcar `[x]` con el numero
  - propuesta (no se toca en esta fase): la tabla de precios de `src/lib/ai/client.ts` esta duplicada respecto a otros servicios; Brain ya estima coste si falta `coste_usd`, se podria delegar
  - propuesta (no se toca en esta fase): si el cliente del chat aborta el stream, `callAiStream` termina por `return()` y esa llamada no se informa a Brain
- [ ] Fase 2 — Verificacion en CI y README al dia: `npm test` en `ci.yml`, README con Next 15

## Esperando

(vacio)

## Bloqueado

(vacio)

## Hecho

- [x] Fase 0 — Encuadre: loop instalado, carta rellena, alias `typecheck`/`test`, gauntlet en VERDE (#5, squash `ae40418`, 2026-10-04)
