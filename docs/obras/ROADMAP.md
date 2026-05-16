# Simvix Obras — Roadmap de 1.000 iteraciones

> Plan vivo. Cada iteración ≈ una PR pequeña con ~30 cambios atómicos. Los
> paquetes están agrupados temáticamente, con dependencias declaradas y un
> propósito claro para que cualquier sesión futura pueda elegir un bloque
> contiguo y ejecutarlo sin necesitar contexto extra.
>
> El estado inicial (PR fundacional) cubre los cimientos de las iteraciones
> **#1–#30**, así que aquí arrancamos en **#31**.

---

## Tabla de paquetes (1000 iteraciones / 30+ tareas cada una)

| Iter. | Paquete | Tema | Depende de | Estado |
|------:|---------|------|-----------|--------|
|   1–30 | P00 | **Foundation** | — | ✅ entregado |
|  31–60 | P01 | **Persistencia avanzada**: multi-tenant, soft-delete, encriptación PII, auditoría, health-check, housekeeping, tuning SQLite, migración a Postgres | P00 | ✅ entregado |
|  61–90 | P02 | **Auth & RBAC**: NextAuth v5 + Credentials, sesión JWT, matriz de permisos (6 roles), scoping por organización, registro, lock-out, API tokens, middleware | P00, P01 | ✅ entregado |
|  91–120 | P03 | **Design system**: dark mode, tokens, componentes ui (Button/Input/Select/Card/Badge/EmptyState/Skeleton/ThemeProvider), settings de organización, gestión de miembros, página /obras/design | P00, P02 | ✅ entregado |
| 121–150 | P04 | Streaming de Claude (SSE) en chat de intake y revisión de documentos | P00 |
| 151–180 | P05 | Subida de planos: PDF/IFC/DXF con storage S3-compatible (R2 / Spaces) | P03 |
| 181–210 | P06 | Vectorización + análisis IA de planos PDF (OCR + visión multimodal) | P05 |
| 211–240 | P07 | Catálogo CYPE/BEDEC: importación, normalización y búsqueda fuzzy de partidas | P00 |
| 241–270 | P08 | Editor de presupuesto inline (drag-drop capítulos, recálculo en vivo) | P07 |
| 271–300 | P09 | Generador de planos vectoriales con LLM (SVG → PDF) | P06 |
| 301–330 | P10 | Cadastro: integración con sede del Catastro y consulta automática por ref. catastral | P00 |
| 331–360 | P11 | PGOU por municipio: ingesta de ordenanzas en RAG (embeddings + búsqueda semántica) | P10 |
| 361–390 | P12 | CTE como knowledge base con cita inline (DB-HE, DB-HR, DB-SI, DB-SUA, DB-HS, DB-SE) | P11 |
| 391–420 | P13 | Cumplimiento DB-HE: cálculo simplificado de demanda térmica y verificación HE0/HE1 | P12 |
| 421–450 | P14 | DB-SI: cálculo de ocupación, recorridos de evacuación, sectorización | P12 |
| 451–480 | P15 | DB-SUA: accesibilidad, itinerarios accesibles, dimensiones mínimas | P12 |
| 481–510 | P16 | Saneamiento, fontanería, electricidad: dimensionado básico vía agentes especializados | P12 |
| 511–540 | P17 | Firma electrónica (autofirma, eIDAS) y sello de tiempo en documentos | P02 |
| 541–570 | P18 | Sede electrónica: integración real con ayuntamientos piloto (Madrid, Barcelona, Sevilla) | P17 |
| 571–600 | P19 | Notificaciones (email, SMS, webhook) en cada cambio de fase / estado | P02 |
| 601–630 | P20 | Portal del cliente (read-only) con acceso por enlace firmado | P17 |
| 631–660 | P21 | Multiagencia y colaboradores externos (visado colegial, ingeniería externa) | P02 |
| 661–690 | P22 | Auditoría completa, log inmutable y trazabilidad legal | P17 |
| 691–720 | P23 | Facturación al cliente, generador de minutas y conexión Stripe/Redsys | P02 |
| 721–750 | P24 | App móvil PWA / iOS-Android para arquitecto en obra (fotos, anotaciones, partes) | P03 |
| 751–780 | P25 | Inspección IA con cámara: detección de no conformidades sobre la marcha | P24 |
| 781–810 | P26 | BIM ligero: IFC 2x3 viewer + extracción de mediciones de modelos | P05 |
| 811–840 | P27 | Cumplimiento DB-HR (acústica) y verificaciones de masa+aislamiento | P12 |
| 841–870 | P28 | Cumplimiento DB-HS (salubridad): ventilación, evacuación aguas | P12 |
| 871–900 | P29 | Cumplimiento DB-SE (seguridad estructural): pre-dimensionado por LLM | P12 |
| 901–930 | P30 | Optimización energética: simulación HULC simplificada con LLM-tool-use | P13 |
| 931–960 | P31 | Internacionalización: Portugal (DL 555/99), Francia (PC/PA), Italia (SCIA/CILA) | P11 |
| 961–990 | P32 | Marketplace de plantillas: estudios pueden vender sus paquetes de documentos | P21 |
| 991–1000 | P33 | Operations: CI/CD avanzado, blue-green deploy, métricas y SLOs | P00 |

---

## Detalle por paquete

Cada bloque incluye 30 tareas atómicas (TA-N.K) con criterio de aceptación.

### P00 — Foundation (iteraciones 1–30) — ✅ ENTREGADO EN ESTA PR

- TA-1: Configurar Prisma con SQLite (provider intercambiable a Postgres).
- TA-2: Modelo Client.
- TA-3: Modelo Project con auditoría IA.
- TA-4: Modelo Phase con unique (projectId,type).
- TA-5: Modelo Document con versionado.
- TA-6: Modelo BudgetItem.
- TA-7: Modelo Drawing.
- TA-8: Modelo Conversation.
- TA-9: Modelo TaskRun con coste.
- TA-10: Modelo Submission.
- TA-11: Modelo ProjectEvent.
- TA-12: Modelo RegulationTemplate.
- TA-13: Enums dominio (TS) — sustituyen enums Prisma.
- TA-14: Cliente Anthropic con modos live/mock/auto.
- TA-15: Patrón Agent (base) con runAgent + persistencia TaskRun.
- TA-16: Agente Intake.
- TA-17: Agente Normativa.
- TA-18: Agente Anteproyecto.
- TA-19: Agente MemoriaTecnica.
- TA-20: Agente Mediciones (con extracción JSON).
- TA-21: Agente Presupuesto (con persistencia BudgetItem).
- TA-22: Agente Planos.
- TA-23: Agente ESS.
- TA-24: Agente Residuos.
- TA-25: Agente DocAdministrativa.
- TA-26: Agente Ayuntamiento.
- TA-27: Orquestador con runPhase y runAllPendingPhases.
- TA-28: Definición de las 11 fases.
- TA-29: Ayuntamientos piloto (Madrid, Barcelona, Valencia, Sevilla, genérico).
- TA-30: API /api/obras (CRUD + run-phase + package + submit) + UI /obras completa + PDF builder + paquete consolidado.

### P01 — Persistencia avanzada (iteraciones 31–60) — ✅ ENTREGADO

- ✅ 31.1 Migración a Postgres en producción → script `obras:migrate-to-postgres`.
- ✅ 31.2 Soft delete (campo `deletedAt`) en Project, Document, BudgetItem, Drawing, Submission, Organization.
- ✅ 31.3 Multi-tenant: `Organization`, `OrganizationMember`, `orgId` en Client y Project, helpers `resolveOrgId` + default org.
- ✅ 31.4 Índices compuestos `(projectId, createdAt)` en TaskRun y ProjectEvent; `(type, createdAt)`, `(status, createdAt)`.
- 31.5 Backups automáticos diarios con retención 30 días (Railway managed, documentado en PRIVACY.md sección 7; automatización SRE → P33).
- 31.6 Read replica (env) y separación de queries read-only → diferido a P33.
- ✅ 31.7 Encriptación at-rest AES-256-GCM de `Client.dni`, `address`, `phone` (`src/lib/security/crypto.ts`, formato `enc:v1:<b64>`).
- 31.8 Workers de jobs (BullMQ) → diferido a P05 cuando entren cargas largas (PDFs grandes + análisis visión).
- ✅ 31.9 Cron de housekeeping (`prisma/scripts/housekeeping.ts`): purga TaskRun > 90 días, ProjectEvent informativos > 180 días, VACUUM SQLite, reset mensual de tokens.
- ✅ 31.10 Test fixtures determinísticos (`prisma/scripts/seed-demo.ts`).
- ✅ 31.11 Auditoría granular de Project (`ProjectAudit` + helper `auditProjectChange`).
- ✅ 31.12 SQLite WAL + `busy_timeout=5000` + `synchronous=NORMAL` aplicados en arranque (`applySqlitePragmas`).
- ✅ 31.13 Generación de `reference` con retry on `P2002` (5 intentos).
- 31.14 Particionamiento por año en ProjectEvent → diferido a P33 (Postgres-only).
- ✅ 31.15 Cuotas por organización: `maxProjects`, `maxAiTokensMonthly`, `maxStorageMb` + `QuotaExceededError`.
- ✅ 31.16 Slow query log Prisma (umbral `OBRAS_SLOW_QUERY_MS`).
- 31.17 Pool de conexiones configurable → en Postgres se hace por DATABASE_URL (`?connection_limit=`); doc en SCHEMA.md.
- ✅ 31.18 Health-check `/api/health` con BD + estado IA + número de agentes.
- 31.19 Pre-warming en deploy → diferido a P33 (warmup queries en hook de despliegue).
- ✅ 31.20 Backfill helper (`prisma/scripts/backfill-org.ts`) + patrón documentado en SCHEMA.md.
- ✅ 31.21 Plan B SQLite → Postgres asistido (`prisma/scripts/migrate-to-postgres.ts`).
- 31.22 Generador automático de PR de migración con rollback → diferido a P33.
- ✅ 31.23 Validación lógica `surfaceM2 > 0` en `createProject` (SQLite no soporta CHECK por Prisma).
- 31.24 Triggers de updatedAt en Postgres → Prisma `@updatedAt` ya lo cubre a nivel app.
- 31.25 Vistas materializadas para dashboard → diferido a P33.
- 31.26 Pgvector ready → activación en P11 (RAG PGOU).
- 31.27 Búsqueda full-text en documentos → diferido a P11/P12.
- ✅ 31.28 Diagrama del esquema (`docs/obras/SCHEMA.md` con mermaid).
- 31.29 Tests de regresión N+1 → diferido (se añadirá en P03 con suite de tests E2E).
- ✅ 31.30 Documentación RGPD y retención (`docs/obras/PRIVACY.md`).

**Cobertura efectiva**: 20/30 tareas atómicas implementadas + 10 explícitamente
diferidas a paquetes posteriores donde encajan mejor con sus dependencias
(Postgres-only en P33, RAG en P11, workers en P05).

### P02 — Auth & RBAC (iteraciones 61–90) — ✅ ENTREGADO

- ✅ 61.1 NextAuth v5 (Auth.js) con provider Credentials. Google + magic link y SSO SAML quedan trivializados (basta añadir provider).
- ✅ 61.2 Modelos `User`, `Account`, `Session`, `VerificationToken`, `OrganizationMember`, `ApiToken`.
- ✅ 61.3 RBAC: 6 roles (`OWNER`, `ADMIN`, `ARCHITECT`, `TECHNICIAN`, `EXTERNAL`, `VIEWER`).
- ✅ 61.4 Matriz declarativa de 19 permisos por recurso (`src/lib/auth/rbac.ts`).
- ✅ 61.5 Middleware Next (`src/middleware.ts`) protege `/obras/*` y `/api/obras/*`, redirige a login con `callbackUrl`.
- 61.6 Invitaciones por email con token firmado → diferido (necesita servicio email en P19).
- ✅ 61.7 Audit de logins fallidos: `User.failedLoginAttempts` + `lockedUntil`.
- 61.8 2FA TOTP → diferido a P02-bis.
- 61.9 SSO SAML → diferido (basta añadir provider Auth.js cuando entre cliente enterprise).
- ✅ 61.10 Sesiones JWT (estrategia `jwt`, callbacks `jwt` y `session`).
- 61.11 Página `/obras/settings` → diferido a P03 (design system).
- 61.12 Switch de organización → preparado en `session.activeOrgId`, UI pendiente (P03).
- 61.13 Refresh tokens con revocación → la JWT de Auth.js ya rota; revocación explícita queda diferida.
- 61.14 Roles por proyecto → diferido a P21.
- 61.15 Auditoría visible en UI → diferido a P22.
- 61.16 GDPR: export/borrado → endpoints planificados en PRIVACY.md sección 4.
- ✅ 61.17 `ApiToken` con `scopes` CSV + helpers `parseScopes` / `tokenCan`.
- 61.18 Rate limiting → diferido a P33 (capa edge/CDN).
- 61.19 Captcha en intake público → diferido a P20 (portal cliente).
- 61.20 reCAPTCHA/hcaptcha → diferido a P20.
- ✅ 61.21 Política de contraseñas (mín 12 chars + blacklist top-20) + bcrypt (12 rondas).
- 61.22 Tests E2E auth → diferido a P03 (suite Playwright).
- 61.23 Password reset por email → diferido a P19 (email service).
- 61.24 Verificación de email → modelo `VerificationToken` listo; integración email en P19.
- 61.25 `/api/me/sessions` → diferido.
- 61.26 Single sign-out → cubierto por `signOut()` Auth.js.
- 61.27 Webhook auth events → diferido a P19.
- ✅ 61.28 Locking de cuenta tras N intentos (`OBRAS_MAX_FAILED_LOGINS` / `OBRAS_LOCK_MINUTES`).
- 61.29 Edición de roles por admin → endpoint `org:members:manage` ya validable; UI pendiente.
- ✅ 61.30 Matriz de permisos documentada inline en `src/lib/auth/rbac.ts`.

**Cobertura efectiva**: 14/30 implementadas + 16 diferidas a paquetes con
mejor afinidad (email/2FA/SAML/UI settings).

### P03 — Design system (iteraciones 91–120) — ✅ ENTREGADO

- ✅ Tokens, dark mode (`darkMode: 'class'` + `ThemeProvider` con auto/light/dark).
- ✅ Componentes base: `Button` (5 variantes × 3 tamaños + loading + iconos), `Input`/`Textarea` con label/hint/error, `Select`, `Card`, `Badge` (6 tonos), `EmptyState`, `Skeleton`.
- ✅ Página `/obras/design` con catálogo de los componentes para referencia rápida.
- ✅ `/obras/settings`: perfil, lista de orgs, cuotas, miembros con rol, último login. Cierra P02-11 (página settings) y P02-12 (org switch en `activeOrgId`).
- ✅ API `/api/organizations/[id]/members` (GET/POST/PATCH/DELETE) con salvaguarda de “no dejar org sin OWNER”. Cierra P02-29 (edición roles por admin).
- ✅ Mejoras a11y básicas: focus rings consistentes, `aria-invalid`, `aria-describedby`.
- ✅ PhaseTimeline y NewProjectForm migrados a primitives del DS.

Diferidas a iteraciones posteriores (la web pública sigue con su tema light):
Storybook formal, mejor escala tipográfica, lucide-react sustituyendo emojis,
imágenes OG dinámicas, command palette (Cmd+K). Quedan para P03-bis.

### P03 — Detalle original (iteraciones 91–120)

- 91.1 Tokens (colors, spacing, radii, shadows) en CSS vars.
- 91.2 Tema claro/oscuro con preferencia del usuario.
- 91.3 Tipografía variable (Inter o similar) + escala tipográfica.
- 91.4 Componentes base: Button, Input, Select, Textarea, Dialog, Toast.
- 91.5 Layout primitives (Stack, Grid, Inline).
- 91.6 Skeleton loaders para listas y detalle.
- 91.7 Tabla con sticky header y scroll horizontal en mobile.
- 91.8 Iconos (lucide-react).
- 91.9 Mejora a11y: focus rings, aria-live, etiquetas.
- 91.10 Reducción de motion (prefers-reduced-motion).
- 91.11 Componente PhaseBadge con colores y estado.
- 91.12 Componente CostBadge (con tooltip mostrando tokens).
- 91.13 EmptyState reutilizable.
- 91.14 ErrorBoundary global con Sentry.
- 91.15 Skeleton de PhaseTimeline durante carga.
- 91.16 Optimistic UI en run-phase.
- 91.17 Animaciones suaves entre pasos (Framer Motion).
- 91.18 Snapshots Storybook (chromatic-like).
- 91.19 Pruebas de contraste color (axe).
- 91.20 Componente Tooltip accesible.
- 91.21 Componente Tabs accesible.
- 91.22 Componente Sidebar colapsable.
- 91.23 Mobile-first y revisión de breakpoints.
- 91.24 Iconografía consistente para fases (sustituye emojis).
- 91.25 Imagen OG dinámica por proyecto (vercel og).
- 91.26 Componente Avatar (cliente, técnico).
- 91.27 Print stylesheets para documentos.
- 91.28 Componente MarkdownView con highlighting.
- 91.29 Componente CommandPalette (Cmd+K).
- 91.30 Documentación del design system (página /obras/design).

### P04 — Streaming Claude (121–150)

- 121.1 SSE endpoint /api/obras/[id]/chat con stream incremental.
- 121.2 Hook React useChat con backpressure.
- 121.3 Persistencia parcial cada N chunks (defensa ante caídas).
- 121.4 Cancelación abortable con AbortController.
- 121.5 Indicador de typing en UI.
- 121.6 Tool use streaming (cuando el agente llama a una tool).
- 121.7 Reintentos exponential backoff en 429/503.
- 121.8 Métricas (tokens/s) en panel admin.
- 121.9 Anonimización de PII antes de enviar al modelo.
- 121.10 Cache de system prompts (prompt caching Claude API).
- 121.11 Cache de contexto de proyecto (gran trozo invariante).
- 121.12 Métricas de cache hit rate.
- 121.13 Truncation strategy si el contexto excede ventana.
- 121.14 Selección dinámica de modelo según fase (opus para razonamiento, haiku para clasificación).
- 121.15 Modo offline: cola local y reintento al reconectar.
- 121.16 Soporte de imágenes adjuntas (visión multimodal).
- 121.17 Soporte voz: dictado al chat.
- 121.18 Lectura por TTS del documento generado.
- 121.19 Auditoría de prompts (versionado de cada plantilla).
- 121.20 A/B de prompts (canary 10% → 100%).
- 121.21 Test de regresión “golden outputs”.
- 121.22 Evaluación automática (rúbrica IA).
- 121.23 Panel de evaluación humana de calidad por documento.
- 121.24 Feedback (👍/👎) con motivo.
- 121.25 Reentrenamiento implícito: prompts mejoran con la curación humana.
- 121.26 Soporte de citas inline (con anchors).
- 121.27 Resaltado de tokens generados frente a tomados de fuentes.
- 121.28 Política de safe completion (filtrar PII, lenguaje sensible).
- 121.29 Documentación: cómo escribir un nuevo agente.
- 121.30 Tests de coste (presupuesto por fase no debe exceder X tokens).

### P05–P33 — Resumen

> Cada paquete restante se desglosa con el mismo nivel de detalle (30 tareas
> atómicas). Para mantener la legibilidad de este documento aquí dejamos los
> objetivos del paquete; la expansión a tareas se mantiene en
> `docs/obras/iterations/Pxx.md` (generadas a medida que se programen).

- **P05 Storage planos**: subida con presign, antivirus, miniaturas, exposición vía URL firmada.
- **P06 Análisis visión**: extracción de cotas, leyendas, detección de discrepancias estado actual vs reformado.
- **P07 Catálogo precios**: importador BC3 / CYPE / BEDEC con búsqueda fuzzy.
- **P08 Editor presupuesto**: drag-drop capítulos, copia de partidas, descuentos, márgenes.
- **P09 Planos vectoriales LLM**: prompt→SVG con cotas dimensionadas.
- **P10 Catastro**: scraping/API y rellenado automático de proyecto desde ref. catastral.
- **P11 RAG PGOU**: ingesta y consulta semántica de ordenanzas por municipio.
- **P12 CTE knowledge**: knowledge base con cita por DB.
- **P13 DB-HE**: cálculo simplificado y memoria justificativa.
- **P14 DB-SI**: cálculos automáticos y plano de evacuación.
- **P15 DB-SUA**: comprobación de itinerarios accesibles.
- **P16 Instalaciones**: dimensionado fontanería, electricidad, saneamiento.
- **P17 Firma electrónica**: integración Autofirma/eIDAS + sello tiempo.
- **P18 Sede electrónica**: presentación real, polling de estado.
- **P19 Notificaciones**: email/SMS/webhook con plantillas i18n.
- **P20 Portal cliente**: acceso firmado para ver progreso.
- **P21 Colaboradores**: visado, ingeniería externa, fontanero, electricista.
- **P22 Auditoría legal**: log inmutable + export forense.
- **P23 Facturación**: minutas + Stripe/Redsys.
- **P24 App móvil PWA**: parte de obra, fotos georreferenciadas.
- **P25 Inspección IA**: detección no conformidades en obra.
- **P26 BIM IFC**: viewer + extracción mediciones del modelo.
- **P27 DB-HR**: cálculos acústicos.
- **P28 DB-HS**: salubridad.
- **P29 DB-SE**: pre-dimensionado estructural por LLM con tool-use.
- **P30 Energía**: simulación HULC simplificada.
- **P31 I18n**: Portugal, Francia, Italia.
- **P32 Marketplace plantillas**: revenue share.
- **P33 SRE**: blue-green, métricas, SLO.

---

## Heurística de avance

Para mantener calidad sostenible:

1. Cada PR debe pasar `npm run type-check && npm run lint && npm run build`.
2. Cada paquete cierra con al menos un documento bajo `docs/obras/iterations/`.
3. Cada agente nuevo trae al menos una salida “golden” de muestra.
4. Cada nueva tabla de BD viene con su migración numerada y descripción.
5. Cada flujo de UI nuevo se prueba en mobile + desktop + dark mode.

---

## Plan recomendado de despliegue por sesión

| Sesión | Iteración objetivo | Resultado tangible |
|-------:|-------------------|--------------------|
| 1 | 1–30 (P00) | ✅ Esta PR |
| 2 | 31–60 (P01) | Postgres en producción + multi-tenant |
| 3 | 61–90 (P02) | Login + roles |
| 4 | 91–120 (P03) | Design system + dark mode |
| 5 | 121–150 (P04) | Chat streaming Claude |
| 6 | 151–210 (P05+P06) | Subida y análisis IA de planos |
| 7 | 211–270 (P07+P08) | Editor de presupuesto profesional |
| 8 | 271–330 (P09+P10) | Planos vectoriales + Catastro |
| 9 | 331–390 (P11+P12) | RAG PGOU + CTE |
| 10 | 391–450 (P13+P14) | DB-HE + DB-SI |
| ... | ... | ... |

La cadencia razonable es **una sesión por paquete**. A tres sesiones por
semana, se completaría el roadmap en ~11 meses.
