# ADR 0001 — El gauntlet ejecuta tipos y tests mediante alias `typecheck` y `test` en package.json

- **Estado:** aceptado
- **Fecha:** 2026-10-04
- **Fase:** 0
- **Decide:** Constructor, auditado por el Critico

## Contexto

`loop-init` genera un manifiesto `.claude/gauntlet.json` cuyas puertas `node:typecheck` y `node:test`
se activan solo si `package.json` declara `typecheck` y `test` (o `test:unit`). Este repositorio llama a
esos scripts `type-check` y `test:cte`, asi que la pasada de referencia los omitio (SKIP) y el gauntlet
no verificaba ni tipos ni tests aunque el proyecto los tiene. Un SKIP por nombre de script es un
agujero silencioso, no una decision.

## Decision

Se anaden a `package.json` los alias `typecheck` (llama a `type-check`) y `test` (agrupa los
`test:*` existentes, hoy `test:cte`). El manifiesto no se toca.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Editar `.claude/gauntlet.json` para que apunte a `type-check`/`test:cte` | El manifiesto base es comun a todos los repositorios y `--update` lo resincroniza; divergir en el nombre lo hace fragil |
| Renombrar `type-check` a `typecheck` | Rompe CI (`ci.yml` llama a `type-check`) y la documentacion del README; un alias no rompe nada |
| Dejar las puertas en SKIP | Equivale a no verificar tipos ni tests: contradice la regla del gauntlet |

## Consecuencias

El gauntlet `full` ejecuta tipos y tests desde la Fase 0. Cada test nuevo (`test:brain` en la Fase 1)
se cuelga de `test` y entra en la puerta sin tocar el manifiesto. CI sigue llamando a `type-check`
hasta la Fase 2, que anade `npm test` al workflow.

## Verificacion

Puerta `node:typecheck` y `node:test` en PASS (no SKIP) en `bin/gauntlet -p full`; metrica
`gauntlet_pass` del presupuesto como suelo del ratchet.
