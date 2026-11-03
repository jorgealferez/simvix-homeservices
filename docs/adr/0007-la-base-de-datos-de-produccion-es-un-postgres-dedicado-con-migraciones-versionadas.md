# ADR 0007 — La base de datos de producción es un Postgres dedicado con migraciones versionadas

- **Estado:** aceptado
- **Tipo:** datos
- **Fecha:** 2026-11-03
- **Fase:** mantenimiento (petición del usuario: «crea la base de datos y todo lo necesario en
  Railway, estable y sólido, sin perder información»)
- **Decide:** Constructor, auditado por el Crítico

## Contexto

La Fase 4 (#16, ADR 0006) dejó la tabla `Lead` en el esquema, pero el servicio de Railway
`simvix-homeservices` no tenía base de datos: el esquema era SQLite y se aplicaba con
`prisma db push`, sin historial de migraciones. En el proyecto de Railway ya existe un servicio
`Postgres` (PostgreSQL 18), pero lo usa `renovation-company-website`. Los logs HTTP de producción
desde octubre muestran **cero** `POST /api/contact` (un único `GET` de un bot con respuesta 405), así
que no hay leads previos que recuperar. El ADR 0005 encendía `/obras` en cuanto existía
`DATABASE_URL`, lo que ahora activaría por sorpresa un módulo que la carta deja fuera.

## Necesidad

Hace falta: sin base de datos, cada lead depende de la retención de logs y lleva datos personales en
claro. Hay que cambiar `provider` a `postgresql`, porque SQLite en un volumen ata el servicio a una
réplica y no tiene las copias gestionadas de Railway para Postgres. Y hay que pasar de `db push` a
migraciones, porque `db push` no deja rastro de qué se aplicó y, con `--accept-data-loss`, puede
borrar columnas en producción.

## Escalabilidad

- `Lead`: unas 3.600 filas al año (ADR 0006), unos 4 MB. Las 37 tablas de /obras siguen vacías
  mientras /obras esté apagado.
- Volumen de 50 GB: holgura de varios órdenes de magnitud.
- Una instancia, región europe-west4 (la misma que el servicio web, red privada); latencia medida en
  local con Postgres 16 para `SELECT 1`: 20 ms en frío.
- A 10x sigue siendo trivial para Postgres. El límite real sería de conexiones si se escala la web en
  réplicas: Prisma abre un pool por instancia (por defecto `num_cpus*2+1`).

## Coherencia

El esquema no cambia de forma: los mismos 38 modelos y tipos. Los dominios siguen como `String` con
constantes en TypeScript; `DateTime` pasa a `TIMESTAMP(3)` y `String` a `TEXT` (traducción estándar
de Prisma). La migración `0_init` es el `migrate diff` desde vacío del esquema actual: crea todas
las tablas, índices y claves foráneas tal como estaban. `applySqlitePragmas()` ya era un no-op fuera
de SQLite.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Reutilizar el `Postgres` de `renovation-company-website` | Comparte volumen, copias y credenciales con otra web; un error de una migración podría afectarle. Aislar cuesta un servicio pequeño |
| Otra base de datos dentro de ese mismo servidor | Mismo radio de impacto en caídas y restauraciones (restaurar el volumen afectaría a las dos webs) |
| SQLite en un volumen de Railway | Una sola réplica, sin copias gestionadas de Postgres ni PITR; obligaría a migrar más tarde |
| Seguir con `prisma db push` en el arranque | Sin historial; un cambio destructivo se aplicaría sin revisión |
| `postgres-ha` (clúster) | Coste y complejidad desproporcionados para el volumen actual; se puede adoptar después restaurando una copia |

## Necesidades futuras

- **Activar /obras**: ya tiene base de datos; bastará `OBRAS_HABILITADO=true`, `AUTH_TRUST_HOST` y
  revisar el ADR 0005.
- **Alta disponibilidad**: pasar a `postgres-ha` restaurando una copia.
- **Más réplicas de la web**: vigilar el pool de conexiones (`connection_limit` en la URL).
- Todo cambio de esquema futuro llega como migración nueva en `prisma/migrations`.

## Migracion y reversibilidad

- **Aplicación**: la base de datos está vacía, así que `0_init` se aplica en un paso
  (`prisma migrate deploy`) en el `preDeployCommand` de Railway (`npm run db:migrate`, definido en
  `railway.toml` y en la configuración del servicio).
- **Si falla**: Railway aborta el despliegue y sigue sirviendo la versión anterior.
- **Sin `DATABASE_URL`**: el script no hace nada.
- **Compatibilidad durante el despliegue**: `DATABASE_URL` se configuró sin redesplegar. La versión
  anterior no llega a usarla, porque solo la lee al arrancar, y el arranque nuevo ya trae el
  `provider` correcto.
- **Reversión**: quitar `DATABASE_URL` del servicio web. La API vuelve a conservar los leads en el
  log, y la base de datos y su volumen se conservan. No se borra nada.

## Seguridad

1. **Identidad**: sin cambios; el formulario es anónimo y /obras sigue apagado (`OBRAS_HABILITADO`).
2. **Autorización**: la base de datos solo es accesible por la red privada de Railway mediante la
   referencia `${{Postgres-Mn3R.DATABASE_URL}}`; no se publica ninguna URL ni contraseña en el
   repositorio ni en esta sesión.
3. **Entrada**: sin cambios (zod + Prisma parametrizado).
4. **Secretos y configuración**: la contraseña de Postgres la genera la plantilla de Railway.
   `OBRAS_FIELD_KEY` la pone la persona en el panel; no pasa por el agente. En producción, sin esa
   clave **no se escribe ningún lead** (`motivo: 'sin-clave'`), para no cifrar con una clave
   provisional que luego no se pueda descifrar.
5. **Datos personales**: siguen cifrados en reposo (ADR 0006). Las copias del volumen contienen datos
   cifrados; sin `OBRAS_FIELD_KEY` no se pueden leer, así que la clave se guarda también fuera de
   Railway.
6. **Frenos**: si la migración falla, se aborta el despliegue; si la base de datos cae, la web sigue
   sirviendo (el *healthcheck* es `/`, no `/api/health`) y los leads van al log. Las copias
   programadas del volumen son un paso de la persona en el panel (`DEPLOY.md`).
7. **Prueba**: con un Postgres 16 local, `npm run db:migrate` aplica `0_init`; la segunda vez dice
   «No pending migrations»; sin `DATABASE_URL` no hace nada. `/api/health` → `ok` con
   `provider: postgres`; `POST /api/contact` → fila `Lead` cifrada; `/obras` → 404 sin
   `OBRAS_HABILITADO`. `npm run test:obras-disponible` (7 casos) y `npm run test:leads` (35
   aserciones, incluido `sin-clave`).

## Decision

Home Services usa un Postgres dedicado en Railway (`Postgres-Mn3R`, volumen
`homeservices-postgres-data`), con migraciones versionadas aplicadas antes de cada despliegue. /obras
requiere además `OBRAS_HABILITADO=true`.

## Verificacion

`npm test` (puerta `node:test`); en producción, los logs del *pre-deploy* muestran `0_init` aplicada,
`GET /api/health` da `db.ok: true` con `provider: postgres` y `GET /obras` da 404.

## Alcance

- `prisma/schema.prisma`
- `prisma/migrations/migration_lock.toml`
- `prisma/migrations/0_init/migration.sql`
