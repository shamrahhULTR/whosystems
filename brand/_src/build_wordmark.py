#!/usr/bin/env python3
"""Outline 'whosystems' from Instrument Sans 700 and emit tight SVG geometry."""
import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Identity

FONT = "/tmp/InstrumentSans-700.ttf"
TEXT = "whosystems"
SIZE = 100.0
LETTER_SPACING = -0.035  # em

f = TTFont(FONT)
upm = f["head"].unitsPerEm
scale = SIZE / upm
cmap = f.getBestCmap()
hmtx = f["hmtx"]
gs = f.getGlyphSet()

pen_x = 0.0
parts = []
bounds = BoundsPen(gs)  # accumulate transformed bounds (y-down, baseline=0)
for ch in TEXT:
    gname = cmap[ord(ch)]
    # transform: translate(pen_x,0) * scale(scale,-scale)  -> y-down, baseline at 0
    t = Identity.translate(pen_x, 0).scale(scale, -scale)
    # path string for output (use per-glyph transform attr for readability)
    spen = SVGPathPen(gs)
    gs[gname].draw(spen)
    d = spen.getCommands()
    if d:
        parts.append(f'  <path transform="translate({pen_x:.3f},0) scale({scale:.6f},{-scale:.6f})" d="{d}"/>')
    # bounds in final coords
    tp = TransformPen(bounds, t)
    gs[gname].draw(tp)
    pen_x += hmtx[gname][0] * scale + LETTER_SPACING * SIZE

xmin, ymin, xmax, ymax = bounds.bounds
out = {
    "inner": "\n".join(parts),
    "xmin": round(xmin, 3), "ymin": round(ymin, 3),
    "xmax": round(xmax, 3), "ymax": round(ymax, 3),
    "w": round(xmax - xmin, 3), "h": round(ymax - ymin, 3),
    "size": SIZE,
}
print(json.dumps(out))
