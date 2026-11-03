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

- [ ] BD de produccion en Railway: Postgres propio con copias programadas, migraciones versionadas y leads cifrados (peticion del usuario 2026-11-03: "crea la base de datos y todo lo necesario en railway, estable y solido sin perder informacion") — EN CURSO (session_017UCRTEvU5d33FpLZF53u4Z, 2026-11-03)

## Esperando`: items que dependen de algo externo (CI, revision, servicio). Al mover uno aqui, el
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

- [ ] Fase 4 — Leads con almacen propio y paginas legales (decision del usuario 2026-11-03: leads en tabla de la BD con ADR `Tipo: datos`; razon social, CIF y domicilio buscados en sus repos/webs, sin inventarlos) — EN CURSO (session_017UCRTEvU5d33FpLZF53u4Z, 2026-11-03)
  - [x] tabla `Lead` con datos personales cifrados y `emailHash` (ADR 0006 `Tipo: datos`); `src/lib/leads-store.ts`
  - [x] `/api/contact` guarda en BD, log sin datos personales, 429 a partir del sexto envio por IP en 10 min; sin BD conserva el lead en el log
  - [x] `/aviso-legal`, `/privacidad`, `/condiciones` con el titular de los avisos legales del usuario (BYTEMEGA..., CIF B87816419, Yuncos); pie y formulario enlazados
  - [x] `test:leads` (33 aserciones) y prueba con SQLite limpia; benchmark `fase_4.json`
  - [ ] gauntlet full en VERDE, PR "Fase 4 — Leads con almacen propio y paginas legales" y squash merge
  - pendiente (dato del usuario): datos del Registro Mercantil; no aparecen en ninguna fuente y no se inventan
  - pendiente (configuracion, usuario): `DATABASE_URL` + `OBRAS_FIELD_KEY` en Railway y `npm run prisma:push`; hasta entonces los leads de produccion quedan en el log

## Esperando

(vacio)

## Bloqueado

- [ ] Datos registrales del titular (la BD de produccion pasa a `## Activo` por peticion del usuario 2026-11-03) — BLOQUEADO: decision de arquitectura e infraestructura del usuario y dato que no existe en ninguna fuente (2026-11-03)
  - que se necesita: (1) elegir la BD de produccion del servicio de Railway `simvix-homeservices`: opcion A SQLite en un volumen de Railway (barato, una sola replica, `provider` sin cambios), opcion B Postgres de Railway (escala y backups, pero exige cambiar `provider` a `postgresql`, lo que afecta tambien a /obras, ADR 0005); despues `OBRAS_FIELD_KEY` y `npm run prisma:push`; (2) los datos del Registro Mercantil de BYTEMEGA INNOVACION E INVERSIONES TECNOLOGICAS SL (tomo, folio, hoja) para `TITULAR.registroMercantil`
  - que se ha hecho: la tabla `Lead`, el cifrado y las paginas legales estan en `main` (#16); sin `DATABASE_URL` la API conserva cada lead en el log (`Lead SIN GUARDAR en BD`)

## Hecho


- [x] `/obras` responde 404 en vez de 500 mientras no tenga base de datos (opcion B del bloqueo; pedida por la sesion coordinadora el 2026-11-03, sin mensaje del usuario localizable) — (#14, squash `8969d40`, 2026-11-03)
  - [x] `obrasDisponible()` + `notFound()` en el layout de /obras; test rojo sin el guard; ADR 0005
  - [x] gauntlet full en VERDE (10 PASS, 4 SKIP), PR y squash merge
  - [x] produccion (20:56 UTC): `/obras`, `/obras/login`, `/obras/nuevo` y `/obras/cte` dan 404; `/` y `/contacto` dan 200
- [x] Poner en marcha el modulo /obras en produccion — RESUELTO con la opcion B (#14, 2026-11-03); la opcion A queda como propuesta si el usuario incorpora /obras a la carta. Motivo original: cambio de arquitectura y de alcance que la carta no contempla (la Meta deja fuera el producto /obras)
  - que se necesita: (1) `schema.prisma` a `postgresql` y migracion inicial (ADR `Tipo: datos`); (2) `DATABASE_URL` del Postgres del proyecto Railway (sin comprobar si ya lo usa `renovation-company-website`: ¿compartir o BD propia?); (3) `AUTH_SECRET` propio y `AUTH_TRUST_HOST=true` (detras del proxy de Railway)
  - que se ha intentado: arreglo del middleware Edge (#12), desplegado; el log de produccion muestra las dos causas restantes
  - opcion A: activar /obras (Postgres propio en el proyecto, coste de un servicio mas; incorporar el producto /obras a la carta con sus criterios)
  - opcion B: dejarlo apagado y que `/obras` responda 404 o una pagina "proximamente" en vez de 500 (un PR pequeño, sin coste); el modulo sigue en el codigo
- [x] `/obras` responde 500 en produccion: el middleware (Edge) importa Prisma via `@/lib/auth/config` — (#12, squash `09a8843`, 2026-11-02)
  - detectado en Railway: 4 respuestas 5xx en 24 h, todas `GET /obras`; log `PrismaClient is not configured to run in Edge Runtime` en `.next/server/src/middleware.js`
  - [x] `src/lib/auth/edge.ts` (sin BD) para el middleware; `config.ts` la extiende; ADR 0004 con `## Seguridad`
  - [x] `src/middleware.test.ts` en `npm test`: rojo contra el codigo anterior, verde con el nuevo; bundle del middleware sin `PrismaClient`
  - [x] gauntlet full en VERDE (10 PASS, 4 SKIP), PR y squash merge
  - [x] desplegado en Railway (22:27 UTC): el error de Edge desaparece del log
  - `/obras` SIGUE en 500 por dos causas que el error de Edge tapaba: `UntrustedHost` de Auth.js y `DATABASE_URL` sin definir con `schema.prisma` en SQLite (ver `## Bloqueado`)
- [x] Telefono real de contacto (+34 711 526 127) en la web (peticion del usuario 2026-11-02) — (#10, squash `5a9061a`, 2026-11-02)
  - [x] Railway (simvix-homeservices, production): `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_WHATSAPP`
  - [x] `src/lib/site.ts` con el telefono real por defecto y `/contacto` leyendo de `CONTACT` (sin numero de ejemplo en el codigo)
  - [x] docs (`README.md`, `.env.example`, `docs/marketing/*`) sin "numero de ejemplo"
  - [x] gauntlet full en VERDE, PR y squash merge
  - NO VERIFICADO: que el buzon `hola@simvix.com` exista en OVH (puerto 25 bloqueado en el entorno)
- [x] Fase 2 — Verificacion en CI y README al dia: `npm test` en `ci.yml`, README con Next 15 — (#9, squash `829580b`, 2026-11-02)
  - [x] paso `Tests` (`npm test`) en `ci.yml`
  - [x] README: Next.js 15 + Prisma; `npm test` en scripts
  - [x] gauntlet full en VERDE, PR "Fase 2 — Verificacion en CI y README al dia" y squash merge
- [x] Fase 3 — Captacion local: SEO/GEO, zonas de captacion (familias y profesionales), modelo legal de intermediacion y estrategia en Meta (peticion del usuario 2026-11-02) — (#8, squash `ee2afc9`, 2026-11-02)
  - [x] zonas tipadas (`src/lib/zonas.ts`, 9 zonas, Parla piloto) y JSON-LD (`src/lib/seo.ts`)
  - [x] `/zonas/*`, `/empleo/*` (JobPosting), `/como-funciona`, `robots.ts`, `sitemap.ts`, `/llms.txt`, `og:image`
  - [x] canonicas relativas, titulo de portada sin duplicar, enlazado interno (cabecera, pie, servicio -> zonas)
  - [x] formulario y API con rol, zona, origen y consentimiento (`src/lib/leads.ts`, zod)
  - [x] `test:zonas` en `npm test`; ADR 0003; docs de Meta, SEO/GEO y modelo legal
  - [x] gauntlet full en VERDE, benchmark `fase_3.json`, PR "Fase 3 — Captacion local" y squash merge
  - propuesta (decision del usuario): persistir los leads (BD o email) y sacar los datos personales del log; limitar frecuencia en `/api/contact` (ADR 0003, Seguridad)
  - propuesta (decision del usuario): paginas de aviso legal, privacidad y condiciones; necesitan razon social, CIF y domicilio, que no se inventan
  - propuesta (decision del usuario): banner de cookies y despues pixel + API de conversiones de Meta (`docs/marketing/meta.md`, paso 3)
  - propuesta (decision del usuario): precios de niñera (12 €/h) y cuidado de mayores (14 €/h) no cubren un contrato laboral; revisar con los numeros de `docs/negocio/modelo-legal.md`
  - [x] telefono real en `NEXT_PUBLIC_CONTACT_PHONE` (hecho en #10)
- [x] Conectar con Brain: telemetria de automatizaciones con IA (ref. simvix-brain Fase 11, #21) — Fase 1 de la carta (#6, squash `7751e5a`, 2026-10-04)
  - [x] `src/lib/brain.ts` (BRAIN_URL/BRAIN_TOKEN, fetch con timeout 5 s, errores tragados)
  - [x] informar desde `callAi`/`callAiStream` con `automatizacion` por llamador (agentes, `chat-<agente>`, `analisis-planos`, inspecciones, SVG); no informar en mock
  - [x] `test:brain` colgado de `npm test`
  - [x] `.env.example`, `README.md`, `DEPLOY.md` con `BRAIN_URL`/`BRAIN_TOKEN`
  - [x] PR "Conectar con Brain: telemetría de automatizaciones con IA" con veredicto real, squash merge; despues marcar `[x]` con el numero (#6)
  - propuesta (no se toca en esta fase): la tabla de precios de `src/lib/ai/client.ts` esta duplicada respecto a otros servicios; Brain ya estima coste si falta `coste_usd`, se podria delegar
  - propuesta (no se toca en esta fase): si el cliente del chat aborta el stream, `callAiStream` termina por `return()` y esa llamada no se informa a Brain
- [x] Fase 0 — Encuadre: loop instalado, carta rellena, alias `typecheck`/`test`, gauntlet en VERDE (#5, squash `ae40418`, 2026-10-04)
