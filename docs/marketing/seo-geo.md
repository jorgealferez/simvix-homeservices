# SEO y GEO — Simvix Home Services

> SEO: aparecer en Google y Bing cuando alguien busca «limpieza por horas Parla» o «trabajo
> limpieza Parla». GEO (*generative engine optimization*): que ChatGPT, Gemini, Perplexity, Claude o
> los AI Overviews de Google **nos citen** cuando alguien pregunta «¿quién me limpia la casa en Parla
> con contrato?». Fecha: 2026-11-02.

## Lo que ya hace la web (Fase 3)

| Mejora | Dónde | Para qué |
|---|---|---|
| 9 páginas `/zonas/<municipio>` para familias | `src/app/zonas/[slug]` | Búsquedas locales: «limpieza hogar Getafe», «limpiadora por horas Pinto» |
| 9 páginas `/empleo/<municipio>` con `JobPosting` | `src/app/empleo/[slug]` | Google for Jobs y búsquedas «trabajo limpieza Parla» |
| `/como-funciona` con FAQ | `src/app/como-funciona` | Responde las objeciones (precio, quién emplea, garantía) |
| JSON-LD: `HousekeepingService`, `WebSite`, `Service` por zona, `FAQPage`, `BreadcrumbList`, `JobPosting` | `src/lib/seo.ts` | Resultados enriquecidos y entidad clara para las IAs |
| Canónicas relativas sobre `NEXT_PUBLIC_SITE_URL` | `src/lib/site.ts` | Un solo dominio canónico, también en entornos de prueba |
| Título de portada sin duplicar la marca | `src/app/page.tsx` | Antes salía «… \| Simvix Home Services \| Simvix Home Services» |
| `robots.txt` dinámico que admite rastreadores de IA y cierra `/obras`, `/portal`, `/api` | `src/app/robots.ts` | Que nos lean (y nos citen) sin exponer áreas privadas |
| Sitemap con todas las zonas, empleo y servicios; se eliminan los `public/robots.txt` y `public/sitemap.xml` estáticos que hacían sombra a los dinámicos | `src/app/sitemap.ts` | Una sola fuente de verdad |
| `/llms.txt` | `src/app/llms.txt` | Resumen citable para asistentes de IA |
| Imagen para compartir `og:image` | `src/app/opengraph-image.tsx` | Vista previa al pegar el enlace en Facebook o WhatsApp |
| Enlazado interno: cabecera, pie con todas las zonas, zonas vecinas entre sí, servicio → zonas | componentes | Reparte autoridad y ayuda al rastreo |
| Respuesta directa en la primera frase de cada página de zona | páginas | Es lo que extraen los motores generativos |

Todo está cubierto por `npm run test:zonas` (coherencia de zonas, JSON-LD, sitemap, robots, llms.txt).

## Lo que hay que hacer fuera del código (el usuario)

1. **Google Search Console**: verificar el dominio y enviar `https://homeservices.simvix.com/sitemap.xml`.
   Revisar a las 2 semanas el informe de «Páginas» y el de «Ofertas de empleo».
2. **Bing Webmaster Tools**: igual (importa desde Search Console). Bing alimenta la búsqueda de
   ChatGPT y Copilot: sin Bing, menos citas en IA.
3. **Perfil de Empresa de Google** como *empresa de servicios sin local*: una sola ficha con la
   dirección real (oculta) y como área de servicio los 9 municipios. **No** crear una ficha por
   municipio con direcciones falsas: Google las suspende.
4. **Reseñas**: pedir reseña en Google a cada cliente tras el tercer servicio. Es el factor local más
   fuerte y las IAs las resumen.
5. **Coherencia de entidad (NAP)**: mismo nombre, teléfono y web en Google, Facebook, Instagram,
   WhatsApp y directorios (Páginas Amarillas, Cylex, etc.).
6. **Teléfono real** en `NEXT_PUBLIC_CONTACT_PHONE` (hoy es un número de ejemplo y sale en el JSON-LD).

## Contenido que conviene escribir después (por orden)

Cada pieza responde a una pregunta real con cifras, que es lo que citan las IAs:

1. «¿Cuánto cuesta una empleada del hogar con contrato en 2026?» (comparativa: contratar tú vs.
   empresa).
2. «Cómo dar de alta a una empleada del hogar paso a paso» (atrae a familias que luego prefieren no
   hacerlo ellas: modelo B de `docs/negocio/modelo-legal.md`).
3. «¿Qué pasa si mi limpiadora sin contrato se hace daño en casa?»
4. Para profesionales: «Trabajar de limpiadora con contrato o sin contrato: lo que pierdes».

## Cómo medir GEO

Una vez al mes, preguntar en ChatGPT, Perplexity, Gemini y Claude (sesión nueva):

- «¿Qué empresas de limpieza por horas con contrato hay en Parla?»
- «Busco trabajo de limpiadora con contrato en Fuenlabrada»
- «¿Cuánto cuesta una limpiadora por horas en Getafe?»

Apuntar si nos citan y con qué frase. Si citan a la competencia, mirar qué página suya citan y qué
dato da que la nuestra no.

## Palabras clave por intención

| Intención | Ejemplos | Página |
|---|---|---|
| Familia, local | limpieza hogar parla, limpiadora por horas getafe, asistenta pinto | `/zonas/<zona>` |
| Familia, confianza | limpiadora con contrato, empleada hogar con factura, limpieza por horas con seguro | `/como-funciona` |
| Profesional, local | trabajo limpieza parla, empleo empleada hogar fuenlabrada, ofertas limpieza leganés | `/empleo/<zona>` |
| Profesional, condiciones | trabajo limpieza con contrato, limpiadora dada de alta | `/empleo` |
