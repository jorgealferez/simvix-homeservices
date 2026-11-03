#!/usr/bin/env python3
"""Genera la marca «simvix. home» como trazados SVG desde Fraunces 600 (opsz 144).

Uso: python3 scripts/brand/generar-marca.py <Fraunces[SOFT,WONK,opsz,wght].ttf> <dir-salida>
La fuente no se versiona: se descarga de google/fonts (OFL). Ver docs/adr/0008.
"""
import re
import sys
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

INK = "#0B1220"
CORAL = "#FF5A3C"
WHITE = "#FFFFFF"

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
font = instantiateVariableFont(TTFont(src), {"wght": 600, "opsz": 144, "SOFT": 0, "WONK": 0})
gs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm


def glyph(ch):
    return cmap[ord(ch)]


def path_for(ch, x, y, s):
    """Trazado SVG del caracter con origen (x, y) en la linea base y escala s (y hacia abajo)."""
    pen = SVGPathPen(gs)
    gs[glyph(ch)].draw(TransformPen(pen, (s, 0, 0, -s, x, y)))
    return re.sub(r"-?\d+\.\d+", lambda m: f"{float(m.group()):.2f}".rstrip("0").rstrip("."), pen.getCommands())


def bounds(ch):
    bp = BoundsPen(gs)
    gs[glyph(ch)].draw(bp)
    return bp.bounds  # xMin, yMin, xMax, yMax


def adv(ch):
    return gs[glyph(ch)].width


# ---- Simbolo «h.»: dibujo definitivo de la sesion de identidad del grupo (no se redibuja) ----
H_PATH = "M20.19 33.78 18.93 32.48 20 31.52Q23.5 28.33 26.1 27.05Q28.7 25.77 30.98 25.77Q34.53 25.77 36.69 28.02Q38.85 30.28 38.85 34.08V47.98Q38.85 48.88 39.11 49.3Q39.38 49.71 39.9 49.87L40.86 50.15Q41.41 50.34 41.65 50.63Q41.88 50.92 41.88 51.33Q41.88 51.86 41.52 52.16Q41.16 52.46 40.39 52.46H29.74Q28.2 52.46 28.2 51.25Q28.2 50.51 29.06 50.15L30.1 49.87Q30.65 49.68 30.89 49.27Q31.12 48.86 31.12 47.98V35.21Q31.12 32.78 29.94 31.59Q28.75 30.39 26.77 30.39Q25.53 30.39 24.14 30.97Q22.75 31.55 21.29 32.81ZM21.02 13.3V48.06Q21.02 48.91 21.27 49.3Q21.51 49.68 22.01 49.87L23 50.15Q23.88 50.51 23.88 51.25Q23.88 52.46 22.34 52.46H11.72Q10.95 52.46 10.59 52.16Q10.23 51.86 10.23 51.33Q10.23 50.92 10.47 50.63Q10.7 50.34 11.25 50.15L12.32 49.87Q12.82 49.68 13.05 49.3Q13.29 48.91 13.29 48.06V17.92Q13.29 17.24 13.08 16.93Q12.87 16.63 12.41 16.55L10.95 16.44Q10.45 16.3 10.23 16.05Q10.01 15.8 10.01 15.42Q10.01 14.98 10.27 14.7Q10.53 14.43 11.28 14.15L16.4 12.28Q17.44 11.9 18.07 11.72Q18.71 11.54 19.29 11.54Q20.14 11.54 20.58 12.02Q21.02 12.5 21.02 13.3Z"
DOT_PATH = "M44.63 47.78a4.68 4.68 0 1 0 9.36 0a4.68 4.68 0 1 0 -9.36 0Z"
LABEL = "Simvix Home Services"


def simbolo(letter, bg=None, scale=1.0, radius=0):
    inner = f'<path d="{H_PATH}" fill="{letter}"/><path d="{DOT_PATH}" fill="{CORAL}"/>'
    if scale != 1.0:
        off = 32 * (1 - scale)
        inner = f'<g transform="translate({off:.2f} {off:.2f}) scale({scale})">{inner}</g>'
    rect = f'<rect width="64" height="64" rx="{radius}" fill="{bg}"/>' if bg else ""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" '
        f'role="img" aria-label="{LABEL}"><title>{LABEL}</title>{rect}{inner}</svg>\n'
    )


(out / "simvix-home-marca.svg").write_text(simbolo(INK))
(out / "simvix-home-marca-oscuro.svg").write_text(simbolo(WHITE))
(out / "favicon.svg").write_text(simbolo(WHITE, bg=INK, radius=14))
(out / "_icono-sangre.svg").write_text(simbolo(WHITE, bg=INK, scale=0.7))

# ---- Logotipo «simvix. home services»: «simvix.» Fraunces 600 tinta + punto coral, producto en 400 gris ----
GRAY = "#5B6476"
GRAY_DARK = "#A3AAB8"  # el gris sobre tinta (8:1)
font400 = instantiateVariableFont(TTFont(src), {"wght": 400, "opsz": 144, "SOFT": 0, "WONK": 0})
gs400 = font400.getGlyphSet()
S = 1.0 / upm * 100  # 100 px por em
parts, x = [], 0.0
for ch, role, g in [*[(c, "ink", gs) for c in "simvix"], (".", "dot", gs), *[(c, "gray", gs400) for c in " home services"]]:
    if ch != " ":
        pen = SVGPathPen(g)
        g[glyph(ch)].draw(TransformPen(pen, (S, 0, 0, -S, x, 0)))
        d = re.sub(r"-?\d+\.\d+", lambda m: f"{float(m.group()):.2f}".rstrip("0").rstrip("."), pen.getCommands())
        parts.append((role, d))
    x += g[glyph(ch)].width * S
width = x
top = max(bounds(c)[3] for c in "simvixhome") * S
desc = -min(bounds(c)[1] for c in "simvixhome") * S
padv = 4
H = top + desc + 2 * padv


def logotipo(ink, gray):
    colors = {"ink": ink, "dot": CORAL, "gray": gray}
    body = "".join(f'<path fill="{colors[r]}" d="{d}"/>' for r, d in parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-(top + padv):.2f} {width:.2f} {H:.2f}" '
        f'role="img" aria-label="{LABEL}"><title>{LABEL}</title>{body}</svg>\n'
    )


(out / "simvix-home-logotipo.svg").write_text(logotipo(INK, GRAY))
(out / "simvix-home-logotipo-oscuro.svg").write_text(logotipo(WHITE, GRAY_DARK))
print(f"ok: simbolo definitivo; logotipo {width:.1f}x{H:.1f}")
