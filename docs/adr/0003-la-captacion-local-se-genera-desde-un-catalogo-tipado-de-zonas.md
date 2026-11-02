# ADR 0003 — La captación local se genera desde un catálogo tipado de zonas

- **Estado:** aceptado
- **Fecha:** 2026-11-02
- **Fase:** 3
- **Decide:** Constructor, auditado por el Crítico

## Contexto

El usuario pide (2026-11-02) mejorar el SEO y el GEO de la web pública, definir zonas de captación
para familias y para profesionales, un modelo tipo plataforma que cumpla la legislación con Simvix
como intermediario que asesora y responde, y un plan para entrar en Meta. La web tenía 6 páginas de
servicio sin ubicación, canónicas absolutas fijas, un título duplicado en portada, `robots.txt` y
`sitemap.xml` estáticos en `public/` que hacían sombra a `src/app/sitemap.ts`, y un formulario que no
distinguía familia de profesional ni pedía consentimiento.

## Decisión

Las zonas viven como datos tipados en `src/lib/zonas.ts` y todo lo local (páginas `/zonas/*` y
`/empleo/*`, JSON-LD, sitemap, `llms.txt`, desplegables del formulario) se genera desde ahí, de forma
estática en el build, sin tocar la base de datos.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Tabla `Zona` en Prisma con panel de administración | Cambio de capa de datos y de arquitectura para 9 filas que cambian una vez al trimestre; añadir una zona es un objeto y un PR |
| Páginas escritas a mano por municipio | Duplicación; el test no podría garantizar coherencia de CP, vecindad y sitemap |
| Generar miles de páginas municipio × servicio × barrio | Contenido delgado que Google penaliza; se prefieren 9 + 9 páginas con contexto propio |
| Un `JobPosting` con salario estimado | Publicar una cifra que el usuario no ha fijado sería inventarla; `salarioHoraBrutoDesde` queda en `null` |

## Consecuencias

- 18 páginas locales nuevas, estáticas, con contexto propio por zona (el test exige que no se repita).
- El formulario y la API comparten el esquema `leadSchema` (zod), con `rol`, `zona`, `origen` y
  consentimiento obligatorio.
- La limpieza del hogar pasa a «Desde 25 €/hora» (precio que el usuario ya ofrece públicamente),
  IVA incluido como exige la normativa de consumidores. El resto de precios no cubre un contrato
  laboral: queda anotado en el ledger para decisión del usuario.
- Pendiente (fases propias): persistir leads, páginas legales (aviso legal, privacidad, condiciones),
  banner de cookies y píxel/API de conversiones de Meta.

## Seguridad

1. **Identidad**: las páginas nuevas son públicas y estáticas; no hay sesión ni identidad. La API de
   contacto sigue siendo anónima, como antes.
2. **Autorización**: no se expone nada privado. `robots.ts` cierra `/obras/`, `/portal/` y `/api/` a
   todos los rastreadores, y el test comprueba que el sitemap no incluye esas rutas.
3. **Entrada**: `POST /api/contact` valida con zod en servidor (longitudes máximas, email, servicio y
   zona en lista cerrada, `origen` restringido a `[\w.:/-]`, teléfono con caracteres permitidos) y
   responde 400 con JSON inválido. El JSON-LD se serializa escapando `<` para que ningún texto pueda
   cerrar el `<script>` (test incluido).
4. **Secretos y configuración**: no hay secretos nuevos. `NEXT_PUBLIC_CONTACT_PHONE`,
   `NEXT_PUBLIC_CONTACT_EMAIL` y `NEXT_PUBLIC_WHATSAPP` son públicos por diseño.
5. **Datos personales**: el formulario recoge nombre, email, teléfono y mensaje con consentimiento
   expreso (RGPD art. 6.1.a) y texto informativo. **Riesgo conocido y preexistente**: la API
   escribe el lead completo en el log del servicio porque aún no hay almacén; se mantiene para no
   perder leads y se anota como propuesta prioritaria (persistir en BD o email y dejar en el log solo
   rol, zona, servicio y origen). No se añade ningún tracker ni cookie.
6. **Frenos**: tamaños máximos en todos los campos (mensaje ≤ 2000). Sin limitación de frecuencia:
   anotado junto con la persistencia de leads.
7. **Prueba**: `npm run test:zonas` (consentimiento obligatorio, zonas/servicios desconocidos
   rechazados, `origen` con caracteres raros rechazado, escape del JSON-LD, sitemap sin áreas
   privadas) y prueba manual con `next start` (400 sin consentimiento, 200 con él).

## Verificación

`npm run test:zonas` dentro de `npm test` (puerta `node:test`), `node:build` genera las 18 páginas, y
las métricas `zonas_captacion` y `paginas_locales_en_sitemap` en `docs/benchmarks/presupuesto.json`
con el Ratchet.
