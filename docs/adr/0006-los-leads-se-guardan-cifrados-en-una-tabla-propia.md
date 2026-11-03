# ADR 0006 — Los leads se guardan cifrados en una tabla propia

- **Estado:** aceptado
- **Tipo:** datos
- **Fecha:** 2026-11-03
- **Fase:** 4
- **Decide:** Constructor, auditado por el Crítico

## Contexto

Desde la Fase 3 (#8), `POST /api/contact` valida el formulario público (familias que piden un servicio
y profesionales que se apuntan), pero el lead solo queda en el log del servicio, con nombre, email,
teléfono y mensaje en claro (riesgo anotado en el ADR 0003, sección Seguridad). El 2026-11-03 el
usuario decide guardarlos en una tabla de la base de datos, no por email. El esquema actual
(`prisma/schema.prisma`, SQLite, 37 modelos del módulo /obras) no tiene ninguna tabla de leads. Hay
un `Client` de /obras, pero es un cliente de obra ligado a una organización, no un contacto comercial.

## Necesidad

Sí hace falta tocar el esquema. Sin tabla, los leads siguen dependiendo de la retención de logs de
Railway (días), no se pueden atender derechos RGPD (hay que localizar y borrar a una persona) y los
datos personales siguen en claro en un sistema que no está pensado para guardarlos. Alternativas sin
esquema: reutilizar `Client` mezclaría dominios (exige `orgId`, campos de obra) y metería candidatas
de empleo en una tabla de clientes; el email (Resend) queda descartado por decisión del usuario.

## Escalabilidad

- Hoy: 0 filas. Proyección con el plan de Meta (`docs/marketing/meta.md`: 15 €/día, coste por lead
  objetivo de 5–15 €) y el orgánico: unos 100–300 leads/mes, es decir, unas 3.600 filas al año.
- Cada fila ronda 1 KB (cuatro campos cifrados en base64 más metadatos): unos 4 MB al año.
- Escrituras: menos de 1 por minuto en pico; lecturas: listados internos por fecha y por
  zona/rol/estado.
- Índices: `createdAt` (listado reciente y purga por antigüedad), `(zona, rol, estado)` (cola de
  trabajo por zona) y `emailHash` (derechos RGPD y duplicados). Su coste en escritura es despreciable
  a este volumen.
- A 10x (36.000 filas/año, unos 40 MB) SQLite y Postgres siguen holgados. La purga a 12 meses
  (política de privacidad) acota el crecimiento.

## Coherencia

Sigue las convenciones del esquema: `id String @default(cuid())`, `createdAt`/`updatedAt`, dominios
como `String` con constantes en TypeScript (`src/lib/leads.ts`) porque SQLite no soporta enums Prisma,
y datos personales cifrados con el mismo `src/lib/security/crypto.ts` (AES-256-GCM, `enc:v1:`) que
`obras:encrypt-pii` usa para `Client`. No hay claves foráneas: un lead no pertenece a ninguna
organización ni usuario. Los invariantes del dominio (rol, zona y servicio en lista cerrada,
consentimiento obligatorio) se validan en código con zod antes de escribir. `consentimientoAt` deja
constancia de cuándo se dio el consentimiento.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Reutilizar `Client` de /obras | Exige organización, mezcla clientes de obra con candidatas de empleo y obliga a /obras a estar activo |
| Dos tablas (`SolicitudServicio`, `Candidatura`) | Mismos campos y mismo ciclo de vida hoy; se separan cuando divergen (p. ej. CV adjunto) |
| Guardar en claro y confiar en el disco | El repo ya tiene cifrado de campos; los leads son datos personales de terceros |
| Email con Resend | Descartado por el usuario; además no deja un registro consultable |

## Necesidades futuras

- **Panel de leads y estados** (`nuevo → contactado → convertido/descartado`): el campo `estado` y
  el índice compuesto ya lo soportan sin migración.
- **Atribución de Meta** (API de conversiones): `origen` ya guarda la campaña.
- **Multi-tenant**: si Home Services pasa a varias marcas, habría que añadir una columna `orgId` o
  `marca` nullable (expandir sin romper).
- **Purga a 12 meses**: un script sobre `createdAt` y `estado`; no necesita cambios de esquema.

## Migracion y reversibilidad

El repositorio no usa `prisma migrate`: aplica el esquema con `prisma db push` (`npm run
prisma:push`). Es una tabla nueva sin backfill, así que se aplica en un paso, sin bloquear tablas
existentes. Compatibilidad durante el despliegue: si la tabla o la BD no existen, `guardarLead`
devuelve `error-bd`/`sin-bd` y la API conserva el lead en el log como antes, sin romper el
formulario. Hoy producción **no tiene `DATABASE_URL`** (ADR 0005), así que hasta configurarla rige
ese respaldo. Para activarlo: `DATABASE_URL` (SQLite en volumen o Postgres cambiando el `provider`),
`OBRAS_FIELD_KEY` (32 bytes en base64) y `npm run prisma:push`. Reversión: quitar el modelo y
volver a hacer `db push`, lo que borra la tabla y sus leads (exportarlos antes).

## Seguridad

1. **Identidad**: el formulario sigue siendo anónimo; no se añade login.
2. **Autorización**: no hay ningún endpoint de lectura de leads; solo se leen con acceso a la BD
   (Prisma Studio o el futuro panel, que irá detrás de autenticación).
3. **Entrada**: validación zod en servidor (listas cerradas, longitudes máximas, consentimiento
   literal `true`); Prisma parametriza la escritura, sin SQL en crudo.
4. **Secretos y configuración**: la clave de cifrado es `OBRAS_FIELD_KEY`. Sin ella se deriva una de
   `NEXTAUTH_SECRET` (comportamiento existente); en producción debe configurarse. No se versiona
   ningún secreto.
5. **Datos personales**: nombre, email, teléfono y mensaje se cifran en reposo; `emailHash` permite
   atender derechos sin descifrar. El log solo lleva rol, zona, servicio y origen, **salvo** el
   respaldo sin BD, que conserva el lead completo para no perderlo y deja de ocurrir en cuanto hay
   `DATABASE_URL`. La política de privacidad (`/privacidad`) informa de fines, base legal, plazos (12
   meses) y derechos.
6. **Frenos**: límite de 5 envíos por IP cada 10 minutos (`src/lib/rate-limit.ts`, en memoria; con
   varias réplicas cada una lleva su cuenta), y longitud máxima en todos los campos.
7. **Prueba**: `npm run test:leads` (cifrado y descifrado, normalización del email, sin escritura sin
   BD, fallo de BD sin excepción, log sin datos personales, límite de frecuencia, esquema e índices, este
   ADR completo).

## Decision

Los leads del formulario público se guardan en la tabla `Lead`, con los datos personales cifrados y
segmentación en claro. Mientras el servicio no tenga base de datos, la API los conserva en el log.

## Verificacion

`npm run test:leads` dentro de `npm test` (puerta `node:test`). `node:build` genera el cliente Prisma
con el modelo. Prueba manual: `prisma db push` sobre una SQLite limpia, un `POST /api/contact` crea la
fila con los campos cifrados, y el sexto envío desde la misma IP recibe 429.

## Alcance

- `prisma/schema.prisma`
