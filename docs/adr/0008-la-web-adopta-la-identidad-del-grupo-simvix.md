# ADR 0008 — La web adopta la identidad del grupo «simvix.»

- **Estado:** aceptado
- **Fecha:** 2026-11-03
- **Fase:** 5
- **Decide:** Constructor, auditado por el Critico

## Contexto
El grupo fijo su identidad en el ADR 0014 de `simvix-corporate-website`: la marca es la palabra en
minuscula en Fraunces 600 convertida a trazados, con un solo color propio (el punto final coral
`#FF5A3C`), tinta `#0B1220` sobre blanco y Inter para la interfaz, sin degradados. Simvix Home usaba
un azul y un esmeralda de Tailwind, un degradado en la portada, el emoji 🏡 como logo, iconos con
fondo esmeralda y una imagen Open Graph con degradado azul-verde. Peticion urgente del usuario
(2026-11-03) via la sesion de la web corporativa.

## Decision
La web se pinta con los tokens del grupo: `primary` pasa a ser la escala de tinta (700 = `#0B1220`),
`accent` la escala de coral (500 = `#FF5A3C`, 600 = `#D23A1A` para botones con texto blanco), la
marca «simvix. home» y el simbolo «h.» son trazados SVG generados con fontTools desde Fraunces 600
(opsz 144), y los titulares h1/h2 usan Fraunces 600.

- Activos: `public/brand/simvix-home-{marca,marca-oscuro,logotipo,logotipo-oscuro}.svg`,
  `public/brand/favicon.svg`, `public/icons/icon-{192,512,maskable-512}.png`,
  `public/apple-touch-icon.png`, `src/app/{opengraph,twitter}-image.png` (1200x630, tinta).
- Reproducibles: `python3 scripts/brand/generar-marca.py <Fraunces.ttf> public/brand` y
  `node scripts/brand/rasterizar.mjs` (Chromium de Playwright). La fuente no se versiona (OFL, google/fonts).
- Simbolo con la geometria del «d.» de DevPulse: viewBox 64, asta de 44, punto r = 4,68 sobre la linea base.
- Los colores de estado (rojo error, ambar aviso, verde exito en /obras) se mantienen: son semantica, no marca.

## Alternativas consideradas
| Alternativa | Por que no |
|---|---|
| Marca como texto con la fuente web | Depende de que cargue Fraunces; el ADR del grupo exige trazados |
| Coral `#FF5A3C` en botones con texto blanco | 3,10:1, no llega a AA para texto; `#D23A1A` da 4,82:1 |
| `next/font/google` | Descarga la fuente en el build; el build debe funcionar sin red |
| Seguir generando la Open Graph con `ImageResponse` | Sin la fuente de la marca en el build; PNG estatico generado desde el SVG |

## Consecuencias
Una sola paleta en todo el producto; los botones de llamada a la accion son coral. Las fuentes se
cargan de Google Fonts en tiempo de ejecucion (con `Georgia`/`system-ui` de reserva). El manifest pasa
a ser el de «simvix. home» (`start_url: /`), tambien para /obras, que esta apagado (ADR 0005).

## Verificacion
Contrastes medidos (WCAG 2.1): blanco sobre `#D23A1A` 4,82:1; blanco sobre `#B02E12` (hover) 6,47:1;
tinta sobre blanco 18,72:1; coral sobre tinta 6,04:1; navegacion `#3F4759` sobre blanco 9,30:1; pie
`#A3AAB8` sobre tinta 8,02:1; etiqueta `#B02E12` sobre `#FFE0D9` 5,21:1. Busqueda en `src/` y
`public/`: 0 hex antiguos, 0 degradados, 0 logos emoji. Capturas en `docs/brand/capturas/`
(escritorio y movil). Medidas en `docs/benchmarks/fase_5.json`.
