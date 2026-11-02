# Cómo entrar en Meta (Facebook, Instagram, WhatsApp) — Simvix Home Services

> Plan de captación de los dos lados del mercado: **familias** que piden limpieza y
> **profesionales** que quieren trabajar con contrato. Empieza en Parla (zona piloto) y crece por las
> zonas de `src/lib/zonas.ts`. Fecha: 2026-11-02.

## Por qué Meta primero

La demanda ya está ahí: en los grupos locales de Facebook («Parla», compraventa, vecinos) se publican
a diario mensajes como «Busco señora para limpieza, pago 10 € la hora», y debajo responden en minutos
personas que se ofrecen. Es exactamente nuestro mercado, con los dos lados en la misma conversación.
Meta permite llegar a ambos de tres maneras, de gratis a pago:

1. **Orgánico en grupos locales** (gratis, inmediato).
2. **Perfil de empresa + WhatsApp Business** (gratis, da confianza y convierte).
3. **Anuncios** con formularios instantáneos o clic a WhatsApp (pago, escalable por código postal).

## Paso 0 — Montar la base (una tarde)

- [ ] **Meta Business Suite**: crear la cartera comercial «Simvix Home Services» con el correo de la
  empresa (no uno personal).
- [ ] **Página de Facebook** y **cuenta profesional de Instagram**, conectadas a la cartera. Mismo
  nombre, logo y descripción que la web (`TAGLINE` en `src/lib/site.ts`): la coherencia de nombre,
  teléfono y web ayuda también al SEO local y a que las IAs nos reconozcan como una sola entidad.
- [ ] **WhatsApp Business** con un número dedicado; catálogo con «Limpieza por horas — 25 €/h IVA
  incl.» y respuestas rápidas. Guardar el número en `NEXT_PUBLIC_WHATSAPP` y el teléfono real en
  `NEXT_PUBLIC_CONTACT_PHONE` (hoy la web muestra un número de ejemplo: **sustituirlo antes de gastar
  un euro en anuncios**).
- [ ] **Verificar el dominio** `homeservices.simvix.com` en la cartera (Configuración → Seguridad de la
  marca → Dominios).
- [ ] Método de pago y límite de gasto de cuenta (empezar con 600 €/mes).
- [ ] Comprobar que al compartir `https://homeservices.simvix.com/zonas/parla` sale la imagen y el
  título (Depurador de contenido compartido de Meta). La web ya publica `og:image`.

## Paso 1 — Orgánico en grupos (semana 1, gratis)

Reglas: leer las normas de cada grupo; muchos prohíben publicidad salvo un día concreto. Nunca
publicar el mismo texto en diez grupos a la vez (Meta lo marca como spam). Responder desde el perfil
personal del fundador funciona mejor que desde la página.

**Cuando alguien pide limpiadora** (como el post de Parla), responder así:

> Hola. Si te interesa con todo en regla, tenemos profesionales de Parla verificadas, con contrato y
> alta en la Seguridad Social, a 25 €/h IVA incluido, con factura y sustitución si un día no puede ir.
> Tú no haces papeles. Te dejo la info por si te sirve: homeservices.simvix.com/zonas/parla

**Para quien se ofrece a trabajar**, en otra respuesta o por privado:

> Si limpias casas por Parla y quieres hacerlo con contrato (paro, baja, vacaciones pagadas, sin cuota
> de autónomos), estamos formando equipo. Apuntarte es gratis:
> homeservices.simvix.com/empleo/parla

Lo que **no** se escribe en público: «en B», «os pagamos más que en negro», «busco señora». Lo primero
señala a otros vecinos y puede acabar en un reporte; lo último es un anuncio de empleo discriminatorio.

**Publicaciones propias** (2–3 por semana, donde las normas lo permitan): una para familias y una para
profesionales, con foto real del equipo (con su consentimiento) y el enlace de la zona.

## Paso 2 — Anuncios (desde la semana 2)

### Estructura de campañas

| Campaña | Objetivo en Ads Manager | Formato | Destino | Zona |
|---|---|---|---|---|
| `clientes-<zona>` | Clientes potenciales | Formulario instantáneo **o** clic a WhatsApp | Formulario de Meta / WhatsApp | radio de 3–5 km alrededor del municipio, o sus códigos postales |
| `profesionales-<zona>` | Clientes potenciales | Formulario instantáneo | Formulario de Meta | el municipio y sus vecinas (`vecinas` en `zonas.ts`) |
| `remarketing` (más adelante) | Ventas | Imagen/vídeo | `/zonas/<zona>` | visitantes de la web — **solo con píxel y banner de cookies** |

Empezar con **Parla + Pinto** (zona piloto) y abrir la siguiente ola (`expansion-1`) cuando la
primera tenga lista de espera de familias o de profesionales.

### Segmentación

- **Familias**: ubicación por código postal (`codigosPostales` de cada zona) o radio; edad 30–65; sin
  intereses al principio (dejar que el algoritmo aprenda con el formulario). Idioma: español.
- **Profesionales**: Meta exige declarar la **categoría especial de anuncio «Empleo»** en las ofertas de
  trabajo; al hacerlo limita la segmentación por edad, sexo y ubicación fina. Es correcto y además lo
  que exige la ley: la oferta va a todo el mundo. Usar la ubicación por ciudad/radio que permita.
- Excluir a quien ya ha enviado el formulario (audiencia personalizada de «personas que abrieron o
  enviaron el formulario»).

### Formularios instantáneos (Lead Ads)

- Familias: nombre, teléfono, código postal (pregunta personalizada), «¿cada cuánto?»
  (semanal/quincenal/puntual), «¿cuántas horas?». Pantalla de privacidad con enlace a la política de
  privacidad (**pendiente de publicar**: la necesitamos antes de lanzar).
- Profesionales: nombre, teléfono, municipio, «¿tienes permiso de trabajo en España?», franjas
  disponibles. Nada de fotos, edad ni nacionalidad.
- Tipo de formulario: «Mayor intención» (añade una pantalla de revisión: menos leads, mejores).
- Descargar los leads cada día o conectar Business Suite con el CRM; **llamar en menos de 1 hora**:
  la velocidad de respuesta es lo que más convierte.

### Si el anuncio lleva a la web

Enlazar directamente al formulario ya situado, para no perder la atribución:

```
https://homeservices.simvix.com/contacto?servicio=limpieza-hogar&zona=parla&rol=familia&utm_source=facebook&utm_campaign=clientes-parla
https://homeservices.simvix.com/contacto?servicio=limpieza-hogar&zona=parla&rol=profesional&utm_source=facebook&utm_campaign=profesionales-parla
```

El formulario guarda `utm_source:utm_campaign` como `origen` del lead (`src/lib/leads.ts`).

### Textos de anuncio (para probar 2–3 por campaña)

**Familias**

- «Limpieza en Parla con contrato y factura. Profesionales verificadas de tu barrio, sustitución si un
  día no pueden ir. 25 €/h IVA incluido. Sin papeleo para ti.»
- «¿Te preocupa tener a alguien en casa sin dar de alta? Con nosotros la profesional tiene contrato y
  seguro. Tú solo recibes una factura.»
- «Siempre la misma persona, y si falla, otra de tu zona. Pide en 2 minutos.»

**Profesionales**

- «¿Limpias casas en Parla? Hazlo con contrato: nómina, vacaciones, paro y baja. Servicios cerca de
  casa, en tus horarios. Apuntarte es gratis.»
- «Trabajo de limpieza del hogar en Parla y alrededores. Contrato desde el primer día, sin cuota de
  autónomos. Tú eliges las franjas.»

Creatividades: fotos reales (no de banco de imágenes), vídeos verticales de 10–15 s con una
profesional del equipo contando por qué trabaja con contrato (con su consentimiento por escrito).

### Presupuesto y métricas de partida

Cifras **supuestas** para empezar y medir; se corrigen con los datos de las dos primeras semanas.

| | Familias | Profesionales |
|---|---|---|
| Presupuesto inicial | 10 €/día | 5 €/día |
| Coste por lead objetivo | < 15 € | < 5 € |
| Conversión lead → servicio / lead → alta | 20 % | 25 % |
| Señal de escalar | coste por cliente < 75 € y lista de espera de profesionales | > 2 profesionales por cada 5 clientes regulares |

Regla del mercado de dos lados: **no gastar en familias si no hay profesionales para atenderlas**, ni
al revés. La ratio que se vigila es familias regulares por profesional activa (objetivo inicial: 5–6
familias de 3–4 h semanales por profesional a jornada parcial).

## Paso 3 — Píxel y API de conversiones (cuando haya banner de cookies)

El píxel de Meta instala cookies de terceros: según la LSSI necesita **consentimiento previo**. Hasta
tener un banner de cookies, la medición se hace con los formularios instantáneos (los datos se quedan
en Meta) y con el campo `origen` del formulario web. Cuando haya banner:

1. Píxel en la web solo tras aceptar cookies de marketing.
2. API de conversiones desde el servidor para el evento `Lead` del formulario, con el mismo
   identificador de evento para deduplicar.

Es una fase propia (anotada en `PENDIENTES.simvix-homeservices.md`).

## Calendario de los primeros 30 días

| Semana | Familias | Profesionales |
|---|---|---|
| 1 | Página + Instagram + WhatsApp; responder en grupos de Parla y Pinto | Publicar la oferta en grupos de empleo locales; responder a quien se ofrece |
| 2 | Campaña `clientes-parla` (10 €/día), formulario instantáneo | Campaña `profesionales-parla` (5 €/día) con categoría Empleo |
| 3 | Probar clic a WhatsApp frente a formulario; pedir reseñas en Google a los primeros clientes | Entrevistas y pruebas pagadas; primeras altas |
| 4 | Revisar coste por cliente; abrir Fuenlabrada/Getafe si hay equipo | Abrir oferta en las vecinas de la siguiente ola |
