#!/usr/bin/env python3
import json, os

OUT = "/Users/shmrh/websites and claude/whosystems/brand"
os.makedirs(OUT, exist_ok=True)

# ---- Brand tokens (from site main.css) ----
INK   = "#0C0E0D"   # ink / near-black square
PAPER = "#F5F5F3"   # paper / off-white
ACCENT= "#9BE15D"   # signature green (on dark)
ACCENT_DEEP = "#5CA92E"  # green on light backgrounds (better contrast)

wm = json.load(open("/tmp/wordmark.json"))
WM_INNER = wm["inner"]; WM_W = wm["w"]; WM_XMIN = wm["xmin"]
WM_YMIN = wm["ymin"]; WM_YMAX = wm["ymax"]; WM_H = wm["h"]

HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n'

def mark_inner(square_fill, stroke, dot):
    # Canonical mark geometry, viewBox 0 0 96 96
    return (
        f'  <rect width="96" height="96" rx="26" fill="{square_fill}"/>\n'
        f'  <path d="M21 36 L33.5 64 L47 40 L58.5 64 L71 31" stroke="{stroke}" '
        f'stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>\n'
        f'  <circle cx="76.5" cy="20.5" r="5.5" fill="{dot}"/>'
    )

def write(name, svg):
    p = os.path.join(OUT, name)
    open(p, "w").write(svg)
    print("wrote", name)

# ---------- 1. MARK (square) ----------
def mark_svg(square_fill, stroke, dot, label):
    return (HEAD +
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" '
        f'role="img" aria-label="{label}">\n' + mark_inner(square_fill, stroke, dot) +
        '\n</svg>\n')

write("whosystems-mark-dark.svg",  mark_svg(INK, PAPER, ACCENT,      "whosystems"))
write("whosystems-mark-light.svg", mark_svg(PAPER, INK, ACCENT_DEEP, "whosystems"))

# ---------- 2. WORDMARK (transparent, outlined) ----------
def wordmark_svg(fill, label):
    pad = 0  # tight
    vb_w = round(WM_W, 3); vb_h = round(WM_H, 3)
    # shift so ink starts at 0,0
    g = (f'<g fill="{fill}" transform="translate({-WM_XMIN:.3f},{-WM_YMIN:.3f})">\n'
         f'{WM_INNER}\n</g>')
    return (HEAD +
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w} {vb_h}" '
        f'role="img" aria-label="{label}">\n{g}\n</svg>\n')

write("whosystems-wordmark-ink.svg",   wordmark_svg(INK,   "whosystems"))
write("whosystems-wordmark-paper.svg", wordmark_svg(PAPER, "whosystems"))

# ---------- 3. LOCKUP (mark + wordmark) ----------
def lockup_svg(square_fill, stroke, dot, word_fill, label, mark_border=None):
    M = 120.0                       # mark size
    sf = (M * (20.0/34.0)) / 100.0  # wordmark scale (site nav proportions)
    gap = M * (10.0/34.0)
    wword = WM_W * sf
    total_w = M + gap + wword
    # vertical center of wordmark ink on mark center (y=M/2)
    word_cx = M/2.0
    baseline = word_cx - ((WM_YMIN + WM_YMAX)/2.0) * sf
    wx = (M + gap) - WM_XMIN * sf
    if mark_border:
        rect = (f'<rect x="0.75" y="0.75" width="94.5" height="94.5" rx="25.5" '
                f'fill="{square_fill}" stroke="{mark_border}" stroke-width="1.5"/>')
    else:
        rect = f'<rect width="96" height="96" rx="26" fill="{square_fill}"/>'
    mark = (f'  <g transform="scale({M/96.0:.6f})">\n'
            f'    {rect}\n'
            f'    <path d="M21 36 L33.5 64 L47 40 L58.5 64 L71 31" stroke="{stroke}" '
            f'stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>\n'
            f'    <circle cx="76.5" cy="20.5" r="5.5" fill="{dot}"/>\n'
            f'  </g>')
    word = (f'  <g fill="{word_fill}" transform="translate({wx:.3f},{baseline:.3f}) scale({sf:.6f})">\n'
            f'{WM_INNER}\n  </g>')
    return (HEAD +
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.2f} {M:.2f}" '
        f'role="img" aria-label="{label}">\n{mark}\n{word}\n</svg>\n')

write("whosystems-lockup-ink.svg",
      lockup_svg(INK, PAPER, ACCENT, INK, "whosystems"))           # for light bg
write("whosystems-lockup-paper.svg",                              # for dark bg
      lockup_svg(INK, PAPER, ACCENT, PAPER, "whosystems",
                 mark_border="rgba(245,245,243,0.14)"))            # hairline so box reads on black
print("done")
