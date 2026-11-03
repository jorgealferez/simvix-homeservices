# Instrucciones de Deploy — Simvix Home Services

## Railway (recomendado)

### Opción A: Desde la consola Railway

1. Ve a [railway.app](https://railway.app) y abre el proyecto donde está `renovation-company-website`
2. Click **+ New** → **GitHub Repo**
3. Conecta el repo `jorgealferez/simvix-homeservices`
4. Railway detecta `railway.toml` automáticamente (NIXPACKS + `npm run start`)
5. Configura las variables de entorno:
   ```
   NEXT_PUBLIC_SITE_URL=https://tu-dominio.up.railway.app
   NEXT_PUBLIC_SITE_NAME=Simvix Home Services
   NODE_ENV=production
   # Telemetría de IA hacia Brain (simvix-brain). Opcional: sin ellas no se informa nada.
   # El token lo da el conector `simvix-homeservices` en Brain (Automatizaciones → Conectores).
   BRAIN_URL=https://simvix-brain-production.up.railway.app
   BRAIN_TOKEN=sb_...
   ```
6. El servicio arranca independiente, sin afectar a `renovation-company-website`
7. Asigna un dominio personalizado si tienes uno

### Opción B: Railway CLI

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Vincular al proyecto existente
railway link

# Crear nuevo servicio dentro del proyecto
railway service create simvix-homeservices

# Desplegar
railway up
```

### Variables de entorno en Railway CLI

```bash
railway variables set NEXT_PUBLIC_SITE_URL=https://homeservices.simvix.com
railway variables set NEXT_PUBLIC_SITE_NAME="Simvix Home Services"
railway variables set NODE_ENV=production
```

## Verificación post-deploy

```bash
# Health check
curl -I https://tu-servicio.up.railway.app/

# Comprobar sitemap
curl https://tu-servicio.up.railway.app/sitemap.xml

# Comprobar robots.txt
curl https://tu-servicio.up.railway.app/robots.txt

# Comprobar página de servicios
curl -I https://tu-servicio.up.railway.app/servicios
```

## Dominio personalizado

1. En Railway, ve a **Settings → Domains**
2. Añade `homeservices.simvix.com` (o el dominio que uses)
3. Actualiza el DNS con los registros CNAME que Railway indica
4. Actualiza `NEXT_PUBLIC_SITE_URL` con el dominio definitivo
5. Actualiza `public/robots.txt` y `public/sitemap.xml` con la URL correcta
   (o mejor: usa el sitemap dinámico de Next.js en `src/app/sitemap.ts` que usa `NEXT_PUBLIC_SITE_URL`)

## Rollback

Desde la consola Railway, ve a **Deployments** y haz click en **Rollback** sobre cualquier deploy anterior.

Con Railway CLI:
```bash
railway rollback
```

## Base de datos de producción (ADR 0007)

Estado en el proyecto de Railway «Servicios Domesticos SImvix», entorno `production`:

| Pieza | Valor |
|---|---|
| Servicio Postgres dedicado | `Postgres-Mn3R` (PostgreSQL 18, región europe-west4), **separado** del `Postgres` de `renovation-company-website` |
| Volumen | `homeservices-postgres-data` (50 GB) montado en `/var/lib/postgresql/data` |
| `DATABASE_URL` del servicio web | `${{Postgres-Mn3R.DATABASE_URL}}` (red privada; la contraseña no sale de Railway) |
| Migraciones | `prisma/migrations` (inicial `0_init`), aplicadas por `preDeployCommand = npm run db:migrate` (en `railway.toml` y en la configuración del servicio) |
| /obras | apagado salvo `OBRAS_HABILITADO=true` |

Pasos que hace la persona en el panel (no se pueden hacer desde fuera sin exponer secretos):

1. **Clave de cifrado**: `simvix-homeservices` → Variables → `OBRAS_FIELD_KEY` = salida de
   `openssl rand -base64 32`. Guárdala también en un gestor de contraseñas. **No la cambies nunca**:
   cifra los leads y sin ella las copias no sirven. Hasta que exista, los leads van al log.
2. **Copias programadas**: `Postgres-Mn3R` → volumen `homeservices-postgres-data` → pestaña
   **Backups** → activar *Daily* (6 días), *Weekly* (1 mes) y *Monthly* (3 meses). Restaurar es
   «Restore» sobre una copia: Railway monta un volumen nuevo y conserva el anterior.

Reglas para no perder información:

- Cambios de esquema solo con una migración nueva en `prisma/migrations` (`prisma migrate dev` en
  local) y su ADR `Tipo: datos`. Nunca `prisma db push --accept-data-loss` contra producción.
- No borrar ni desmontar el volumen `homeservices-postgres-data`.

