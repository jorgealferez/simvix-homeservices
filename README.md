# Simvix Home Services

Sitio web de servicios del hogar diarios: recogida de niños del colegio, limpieza, niñera, hacer la compra y cuidado de personas mayores.

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
npm run dev         # Servidor de desarrollo
npm run build       # Build de producción
npm run start       # Servidor de producción
npm run lint        # ESLint
npm run type-check  # TypeScript sin emitir
```

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio | `https://homeservices.simvix.com` |
| `NEXT_PUBLIC_SITE_NAME` | Nombre del sitio | `Simvix Home Services` |
| `RESEND_API_KEY` | API key para envío de emails (opcional) | `re_xxxxx` |
| `CONTACT_EMAIL` | Email de destino del formulario | `hola@simvix.com` |

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
