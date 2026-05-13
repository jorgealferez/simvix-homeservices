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
