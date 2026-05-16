# Simvix Home Services + Simvix Obras

Repositorio con dos productos coexistiendo:

1. **Simvix Home Services** — web de servicios del hogar diarios (recogida de
   niños, limpieza, niñera, compra, cuidado de mayores). Es la web original.
2. **Simvix Obras** (`/obras`) — plataforma de orquestación con IA que lleva un
   proyecto de obra desde la conversación inicial con el cliente hasta el
   paquete documental presentado al ayuntamiento. Ver
   [`docs/obras/ARCHITECTURE.md`](docs/obras/ARCHITECTURE.md) y el
   [roadmap de 1.000 iteraciones](docs/obras/ROADMAP.md).

## Stack

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Deploy**: Railway (servicio independiente)

## Servicios implementados

| Servicio | Slug | Precio desde |
|---|---|---|
| Recogida de niños del colegio | `/servicios/recogida-ninos` | 8€/recogida |
| Limpieza del hogar | `/servicios/limpieza-hogar` | 15€/hora |
| Niñera y cuidado de niños | `/servicios/ninera` | 12€/hora |
| Hacer la compra | `/servicios/hacer-la-compra` | 10€/servicio |
| Cuidado de personas mayores | `/servicios/cuidado-mayores` | 14€/hora |
| Otros servicios domésticos | `/servicios/otros-servicios` | A medida |

## Estructura de directorios

```
src/
├── app/
│   ├── layout.tsx              # Metadata SEO global, Header + Footer
│   ├── page.tsx                # Homepage: Hero + Services + ContactForm
│   ├── globals.css
│   ├── not-found.tsx           # Página 404
│   ├── sitemap.ts              # Sitemap dinámico Next.js
│   ├── api/contact/route.ts    # API endpoint formulario de contacto
│   ├── servicios/
│   │   ├── page.tsx            # Listado de todos los servicios
│   │   └── [slug]/page.tsx     # Página de detalle por servicio
│   └── contacto/
│       └── page.tsx            # Página de contacto
├── components/
│   ├── Header.tsx              # Navegación responsive
│   ├── Footer.tsx              # Footer con links y contacto
│   ├── Hero.tsx                # Hero section con stats
│   ├── Services.tsx            # Grid de servicios
│   ├── ServiceCard.tsx         # Card de servicio (variantes: grid/featured)
│   └── ContactForm.tsx         # Formulario de contacto con validación
└── lib/
    └── services.ts             # Datos de los 6 servicios domésticos
```

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Variables de entorno
cp .env.example .env.local
# Edita .env.local con tus valores

# Servidor de desarrollo
npm run dev

# Abrir http://localhost:3000
```

## Scripts disponibles

```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción (genera Prisma client antes)
npm run start            # Servidor de producción
npm run lint             # ESLint
npm run type-check       # TypeScript sin emitir
npm run prisma:push      # Aplica el schema a la BD (dev)
npm run prisma:studio    # Prisma Studio en localhost
npm run prisma:seed      # Sembrar plantillas de normativa
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio | `https://homeservices.simvix.com` |
| `NEXT_PUBLIC_SITE_NAME` | Nombre del sitio | `Simvix Home Services` |
| `RESEND_API_KEY` | API key para envío de emails (opcional) | `re_xxxxx` |
| `CONTACT_EMAIL` | Email de destino del formulario | `hola@simvix.com` |
| `DATABASE_URL` | Base de datos (SQLite por defecto / Postgres en prod) | `file:./prisma/dev.db` |
| `ANTHROPIC_API_KEY` | API key de Anthropic Claude (módulo /obras) | `sk-ant-...` |
| `OBRAS_AI_MODE` | `auto` (default) / `live` / `mock` | `mock` |
| `OBRAS_DEFAULT_MODEL` | Modelo Claude por defecto | `claude-opus-4-7` |
| `OBRAS_FIRMA_*` | Datos del estudio para firmar PDFs generados | (opcionales) |
| `OBRAS_AYUNTAMIENTOS_HABILITADOS` | CSV de slugs activos | `madrid,barcelona,...` |

## Deploy en Railway

### Nuevo servicio en proyecto existente

1. Accede al proyecto Railway donde está `renovation-company-website`
2. Click **New Service → GitHub Repo**
3. Selecciona `jorgealferez/simvix-homeservices`
4. Railway detecta `railway.toml` automáticamente
5. Añade las variables de entorno del `.env.example`
6. El servicio se despliega en un dominio independiente (sin conflicto)

### railway.toml

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

## SEO

- Metadata completa (title, description, OG, Twitter) en `layout.tsx`
- Sitemap dinámico en `/sitemap.xml` via `app/sitemap.ts`
- `robots.txt` en `/public/robots.txt`
- Structured data JSON-LD (LocalBusiness + Service) en homepage y páginas de detalle
- Breadcrumbs semánticos en páginas interiores
- `canonical` en cada página
- `lang="es"` en `<html>`

## Formulario de contacto

El endpoint `/api/contact` valida nombre, email y servicio. Para activar el envío de emails:

1. Instalar Resend: `npm install resend`
2. Añadir `RESEND_API_KEY` en las variables de entorno
3. Descomentar el bloque de Resend en `src/app/api/contact/route.ts`

## CI/CD

GitHub Actions en `.github/workflows/ci.yml` ejecuta en cada push/PR:
1. `npm run type-check` — TypeScript
2. `npm run lint` — ESLint
3. `npm run build` — Build completo

---

**Diferencia con `renovation-company-website`**: Público objetivo completamente distinto (familias, personas mayores vs. propietarios que reforman). No hay solapamiento de servicios ni de keywords SEO.

---

## Módulo /obras — Orquestación IA cliente → ayuntamiento

Disponible en [`/obras`](http://localhost:3000/obras) tras `npm run dev`.

### Quickstart

```bash
# 1. Copiar variables
cp .env.example .env.local

# 2. Inicializar BD local (SQLite zero-config)
npm run prisma:push
npm run prisma:seed

# 3. Arrancar
npm run dev
# Abrir http://localhost:3000/obras
```

Si **no** configuras `ANTHROPIC_API_KEY`, los agentes funcionan en modo *mock*
determinista: la UI y el flujo completo se pueden probar sin coste y sin red.
Con la key configurada, las llamadas se hacen a Claude (modelo
`claude-opus-4-7` por defecto, configurable).

### Las 11 fases del workflow

1. **Intake** — captura estructurada de la necesidad del cliente.
2. **Normativa** — análisis PGOU, CTE, accesibilidad, régimen de licencia.
3. **Anteproyecto** — programa, esquema espacial, estimación inicial.
4. **Memoria técnica** — descriptiva y constructiva conforme CTE.
5. **Mediciones** — capítulos y partidas con cantidades.
6. **Presupuesto** — precios unitarios, PEM, PEC, IVA.
7. **Planos** — plan de planos requeridos.
8. **ESS** — estudio básico de seguridad y salud (RD 1627/1997).
9. **Gestión de residuos** — RD 105/2008.
10. **Doc. administrativa** — modelos, tasas, declaración responsable.
11. **Presentación** — escrito al ayuntamiento + paquete consolidado.

Cada fase está respaldada por un agente IA especializado en
`src/lib/ai/agents/`.

### Generación del paquete final

Una vez completadas todas las fases, `GET /api/obras/[id]/package` devuelve un
PDF con portada + todos los documentos generados, en orden, listo para
presentar al ayuntamiento.

### Mapa completo de URLs

Tras `npm run dev` y registrarte en `/obras/registro`:

| Área | URL |
|---|---|
| Punto de entrada | `/obras` |
| Crear / detalle proyecto | `/obras/nuevo`, `/obras/[id]` |
| Catálogos CYPE/BEDEC | `/obras/catalogos` |
| Base de normativa (PGOU + CTE) | `/obras/knowledge` |
| Comprobador CTE | `/obras/cte` |
| Facturación | `/obras/facturacion` |
| Marketplace de plantillas | `/obras/marketplace` |
| Notificaciones | `/obras/notificaciones` |
| Admin & métricas | `/obras/admin` |
| Perfil / org / miembros / webhooks | `/obras/settings` |
| Design system | `/obras/design` |
| Portal del cliente final | `/portal/[token]` (sin login) |
| Healthcheck | `/api/health` |
| Métricas Prometheus | `/api/metrics` |

### Setup local en 1 comando

```bash
cp .env.example .env.local
# Edita AUTH_SECRET: openssl rand -base64 32
npm install
DATABASE_URL="file:./dev.db" npm run seed:all   # push + seed + catalog + CTE + demo
npm run dev
```

### Tests

```bash
npm run type-check
npm run lint
npm run test:cte    # cálculos CTE (HE1 / SI3 / SUA9 / HR / HS3 / SE / instalaciones)
```

Ver [`docs/obras/ARCHITECTURE.md`](docs/obras/ARCHITECTURE.md) y
[`docs/obras/ROADMAP.md`](docs/obras/ROADMAP.md) para la planificación de las
1.000 iteraciones siguientes (P01–P33).
