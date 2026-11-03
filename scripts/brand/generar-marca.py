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


# ---- Simbolo «h.» (viewBox 0 0 64 64, plantilla del «d.» de DevPulse) ----
R = 4.68
GAP = 2.6
xmin, _, xmax, ymax = bounds("h")
s = 44 / ymax  # altura del asta = 44 de 64
lw = (xmax - xmin) * s
total = lw + GAP + 2 * R
x0 = (64 - total) / 2 - xmin * s
base = 54
h_path = path_for("h", x0, base, s)
cx = x0 + xmax * s + GAP + R
cy = base - R


def simbolo(letter, dot, bg=None, pad=0.0, radius=0):
    """bg: baldosa de fondo; pad: margen relativo para iconos."""
    inner = f'<path fill="{letter}" d="{h_path}"/><circle fill="{dot}" cx="{cx:.2f}" cy="{cy:.2f}" r="{R}"/>'
    if pad:
        k = 1 - 2 * pad
        inner = f'<g transform="translate({64 * pad:.2f} {64 * pad:.2f}) scale({k:.4f})">{inner}</g>'
    rect = f'<rect width="64" height="64" rx="{radius}" fill="{bg}"/>' if bg else ""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="simvix. home">'
        f"<title>simvix. home</title>{rect}{inner}</svg>\n"
    )


(out / "simvix-home-marca.svg").write_text(simbolo(INK, CORAL))
(out / "simvix-home-marca-oscuro.svg").write_text(simbolo(WHITE, CORAL))
(out / "favicon.svg").write_text(simbolo(WHITE, CORAL, bg=INK, pad=0.12, radius=14))
(out / "_icono-baldosa.svg").write_text(simbolo(WHITE, CORAL, bg=INK, pad=0.16, radius=14))
(out / "_icono-sangre.svg").write_text(simbolo(WHITE, CORAL, bg=INK, pad=0.24, radius=0))

# ---- Logotipo «simvix. home» ----
S = 1.0 / upm * 100  # 100 px por em
parts, x = [], 0.0
for ch, fill in [*[(c, INK) for c in "simvix"], (".", CORAL), (" ", None), *[(c, INK) for c in "home"]]:
    if fill:
        parts.append((fill, path_for(ch, x, 0, S)))
    x += adv(ch) * S
width = x
top = max(bounds(c)[3] for c in "simvixhome") * S
desc = -min(bounds(c)[1] for c in "simvixhome") * S
padv = 4
H = top + desc + 2 * padv


def logotipo(ink):
    body = "".join(f'<path fill="{ink if f == INK else f}" d="{d}"/>' for f, d in parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-(top + padv):.2f} {width:.2f} {H:.2f}" '
        'role="img" aria-label="simvix. home"><title>simvix. home</title>'
        f"{body}</svg>\n"
    )


(out / "simvix-home-logotipo.svg").write_text(logotipo(INK))
(out / "simvix-home-logotipo-oscuro.svg").write_text(logotipo(WHITE))
print(f"ok: simbolo h. (escala {s:.4f}, punto en {cx:.2f},{cy:.2f}); logotipo {width:.1f}x{H:.1f}")
