# ADR 0011 — Cada lead se envía a Brain por un outbox durable

- **Estado:** aceptado
- **Tipo:** datos
- **Fecha:** 2026-11-12
- **Fase:** fuera de las fases de la carta; peticion cruzada de simvix-brain Fase 29 (C27)
- **Decide:** Constructor, auditado por el Crítico

## Contexto

Brain (simvix-brain) es el punto de gestión unificado del grupo y centraliza contactos y leads de todas
las webs con su origen (contrato de eventos v1, `docs/contrato-eventos.md` en simvix-brain:
`POST /api/eventos`, `Bearer BRAIN_TOKEN`, `202` = guardado, `400` = no reintentar, lo demás =
reintentar). El contrato exige a cada aplicación el patrón *outbox*: guardar el evento en su propia base
en la misma transacción que el dato de negocio y enviarlo después con reintentos, para no perder ninguno
si Brain no responde. Hasta hoy cada lead de `/api/contact` se guardaba en `Lead` (ADR 0006) y se avisaba
por correo y a un panel central (`LEADS_HUB_URL`, ADR 0010) que nunca se configuró porque el módulo del
hub no estaba en el plan: ese bloqueo del ledger se resuelve apuntando a Brain.

## Necesidad

Sí hace falta una tabla. Un envío directo desde la petición (como `notificarLead`) pierde el lead en
Brain si Brain está caído, reiniciando o sin desplegar la ruta (404), y el contrato pide expresamente no
perderlo. La alternativa sin esquema (reintentar en memoria) se pierde con cada reinicio o despliegue
de Railway. El disco del contenedor es efímero. La base Postgres (`Postgres-Mn3R`, ADR 0007) es la única
almacenamiento durable del servicio y ya guarda el lead.

## Escalabilidad

- Volumen: uno por lead; con la proyección del ADR 0006 (100–300 leads/mes) son unas 3.600 filas al año.
- Cada fila ronda 1–1,5 KB mientras está pendiente (evento cifrado) y unos 200 bytes una vez enviada
  (la copia cifrada se vacía): menos de 1 MB al año.
- Escrituras: una inserción por lead (dentro de su transacción) y una actualización por envío; lecturas:
  una consulta por minuto por réplica (`estado = 'pendiente' AND siguienteIntento <= now()`, hasta 100).
- Índices: `clave` única (idempotencia y que un lead tenga un solo evento) y `(estado, siguienteIntento)`
  para la consulta del vaciado. A 10x el coste sigue siendo despreciable.

## Coherencia

Mismas convenciones que `Lead`: `id String @default(cuid())`, `createdAt`/`updatedAt`, dominios como
`String` con su lista en TypeScript (`src/lib/brain-eventos.ts`), datos personales cifrados con
`src/lib/security/crypto.ts`. Sin clave foránea a `Lead`: la `clave` (`lead-<id>`) es la referencia y el
outbox podrá llevar otros tipos (`presupuesto`) sin depender de una tabla concreta. El invariante «un
lead guardado siempre tiene su evento» lo da la transacción de `guardarLead`: o se escriben los dos o
ninguno (y entonces el lead se conserva en el log, como ya hacía la API).

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Envío directo desde `/api/contact` (como `notificarLead`) | Si Brain no responde, el lead no llega nunca a Brain |
| Columnas de envío en `Lead` | Mezcla estado de integración con el dato de negocio y no sirve para otros tipos de evento |
| Cola externa (Redis, un broker) | Un servicio y un coste más en Railway sin ganar garantías: Postgres ya es durable y con volumen |
| Fichero en disco | El disco del contenedor de Railway se pierde en cada despliegue |

## Necesidades futuras

- **Presupuestos** (`tipo = presupuesto`, contrato §2.3): los `BudgetItem` de /obras son presupuestos
  internos de obra, el módulo está apagado en producción (ADR 0005) y no se ofrecen a clientes; si se
  activa y se quieren en Brain, basta escribir su evento en esta misma tabla con su clave.
- **Panel de envíos**: `estado`, `intentos`, `ultimoError` permiten listar lo rechazado sin migración.
- **Purga**: lo `enviado` puede borrarse pasado un tiempo con un script sobre `estado` y `enviadoAt`.

## Migracion y reversibilidad

Migración versionada `prisma/migrations/1_brain_outbox` (tabla nueva, sin backfill), aplicada en el
pre-deploy (`npm run db:migrate`, ADR 0007); si falla, el despliegue se aborta y sigue la versión
anterior. Los leads anteriores a esta migración no se reenvían (en producción no hay ninguno real: ver
ledger, 0 `POST /api/contact` antes del 2026-11-03 y un lead de verificación). Reversión: revertir el
código (el lead sigue guardándose sin evento) y, si se quiere, una migración que haga `DROP TABLE
"BrainOutbox"`.

## Seguridad

1. **Quién llama**: el envío lo hace el propio servidor a `BRAIN_URL` con `Authorization: Bearer
   BRAIN_TOKEN`; no se abre ningún endpoint nuevo.
2. **Qué toca**: solo escribe en `BrainOutbox` y solo envía eventos `contacto` de leads ya validados por
   zod (listas cerradas y longitudes); el teléfono se normaliza a 6–16 dígitos y los textos se recortan
   a los límites del contrato para no provocar rechazos.
3. **Entrada de fuera**: la respuesta de Brain solo se lee por su código; el cuerpo de un error se guarda
   recortado a 500 caracteres en `ultimoError` y no se interpreta.
4. **Secretos**: `BRAIN_TOKEN` nunca se registra ni se guarda: se sustituye por `[BRAIN_TOKEN]` en
   cualquier mensaje de error. Sin `BRAIN_URL` o `BRAIN_TOKEN` no se envía nada (cerrado) y los eventos
   esperan en el outbox. Nada se versiona.
5. **Datos personales**: el evento (nombre, email, teléfono, mensaje) va cifrado en la tabla con
   `OBRAS_FIELD_KEY`, viaja por HTTPS a Brain, que es del mismo titular, y la copia cifrada se vacía al
   recibir `202`. El log solo dice cuántos eventos se enviaron, se reintentan o se rechazaron.
6. **Frenos**: lotes de 100 como máximo, timeout de 10 s, espera creciente (30 s a 1 h) y un solo vaciado
   a la vez por proceso; reenviar es seguro porque Brain deduplica por `clave`.
7. **Prueba**: `npm run test:brain-eventos` y `npm run test:leads`.

## Decision

Cada lead guardado deja en la misma transacción un evento `contacto` (clave `lead-<id>`) en la tabla
`BrainOutbox`; el servidor lo envía al terminar la petición y cada minuto (`src/instrumentation.ts`)
hasta recibir `202` o `400`. Un lead que no se pudo guardar en BD se intenta enviar una vez directamente.

## Verificacion

`npm run test:brain-eventos` (mapeo, 202/400/404/5xx/red, espera, aislamiento de un 400 en lote, token
fuera de errores, migración y este ADR) y `npm run test:leads` (lead y evento en la misma transacción)
dentro de `npm test` (puerta `node:test`); `node:build` compila `instrumentation.ts`. Envío real a Brain:
NO VERIFICADO hasta configurar `BRAIN_URL`/`BRAIN_TOKEN` en Railway.

## Alcance

- `prisma/schema.prisma`
- `prisma/migrations/1_brain_outbox/migration.sql`
- `src/lib/brain-eventos.ts`
- `src/lib/leads-store.ts`
- `src/app/api/contact/route.ts`
- `src/instrumentation.ts`
