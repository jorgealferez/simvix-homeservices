# ADR 0009 — La marca usa los dibujos definitivos del grupo

- **Estado:** aceptado (sustituye en parte al ADR 0008: simbolo y logotipo)
- **Fecha:** 2026-11-03
- **Fase:** 5
- **Decide:** Constructor, auditado por el Critico

## Contexto
La sesion que diseno la identidad «simvix.» (elegida por el usuario) envio los dibujos definitivos
para este repositorio despues del merge de #22. El simbolo de #22 se habia redibujado desde Fraunces y
el logotipo decia «simvix. home» en un solo peso.

## Decision
El simbolo «h.» es el trazado definitivo recibido, sin redibujar (en `scripts/brand/generar-marca.py`),
y el logotipo es «simvix.» en Fraunces 600 tinta con punto coral mas «home services» en Fraunces 400
gris `#5B6476` (`#A3AAB8` en la version oscura). Favicon, `icon-192`, `icon-512` y `apple-touch-icon`
son el render de `favicon.svg` (baldosa tinta, rx 14); el maskable es tinta a sangre con el simbolo al 70 %.

## Alternativas consideradas
| Alternativa | Por que no |
|---|---|
| Mantener el simbolo generado en #22 | Diverge del dibujo del grupo; la regla es usarlo tal cual |

## Consecuencias
Misma geometria que el resto de productos del grupo. Etiqueta accesible «Simvix Home Services».

## Verificacion
`#5B6476` sobre blanco 5,95:1; `#A3AAB8` sobre tinta 8,0:1. Capturas en `docs/brand/capturas/`.
