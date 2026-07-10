#!/usr/bin/env python3
import os, re
BRAND = "/Users/shmrh/websites and claude/whosystems/brand"

def svg(name):
    s = open(os.path.join(BRAND, name)).read()
    s = re.sub(r'<\?xml[^>]*\?>\s*', '', s)  # drop xml decl for inline use
    return s.strip()

lockup_ink   = svg("whosystems-lockup-ink.svg")
lockup_paper = svg("whosystems-lockup-paper.svg")
mark_dark    = svg("whosystems-mark-dark.svg")
mark_light   = svg("whosystems-mark-light.svg")
word_ink     = svg("whosystems-wordmark-ink.svg")
word_paper   = svg("whosystems-wordmark-paper.svg")

INK="#0C0E0D"; PAPER="#F5F5F3"; ACCENT="#9BE15D"; ACCENT_DEEP="#5CA92E"

html = f"""<!doctype html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap');
@page {{ size: Letter; margin: 0; }}
* {{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
html,body {{ margin:0; padding:0; font-family:'Instrument Sans',-apple-system,sans-serif; }}
.page {{ width:8.5in; height:11in; padding:0.85in 0.9in; page-break-after:always; position:relative; overflow:hidden; }}
.light {{ background:{PAPER}; color:{INK}; }}
.dark  {{ background:{INK}; color:{PAPER}; }}
.ey {{ font-size:9pt; letter-spacing:.32em; text-transform:uppercase; font-weight:600; opacity:.55; margin:0 0 6px; }}
.acc {{ color:{ACCENT_DEEP}; opacity:1; }}
.dark .acc {{ color:{ACCENT}; }}
h1 {{ font-size:26pt; font-weight:700; letter-spacing:-.02em; margin:0 0 2px; }}
.tag {{ font-size:11pt; opacity:.55; margin:0 0 34px; }}
.block {{ margin:0 0 30px; }}
.cap {{ font-size:8.5pt; letter-spacing:.18em; text-transform:uppercase; font-weight:600; opacity:.45; margin:0 0 12px; }}
.hero {{ display:flex; align-items:center; justify-content:center; padding:46px 0; border-radius:16px; }}
.hero.l {{ background:#ECECE8; }}
.hero.d {{ background:#15181C; }}
.hero svg {{ height:78px; }}
.grid {{ display:flex; gap:18px; }}
.cell {{ flex:1; border-radius:14px; padding:26px; display:flex; align-items:center; justify-content:center; min-height:120px; }}
.cell.l {{ background:#ECECE8; }} .cell.d {{ background:#15181C; }}
.cell.mk svg {{ height:72px; }}
.cell.wd svg {{ height:34px; }}
.swatches {{ display:flex; gap:14px; margin-top:6px; }}
.sw {{ flex:1; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,.08); }}
.sw .chip {{ height:64px; }}
.sw .meta {{ padding:9px 11px; font-size:8.5pt; background:#15181C; color:{PAPER}; }}
.sw .meta b {{ display:block; font-weight:600; font-size:9.5pt; }}
.sw .meta span {{ opacity:.5; font-family:ui-monospace,monospace; }}
.foot {{ position:absolute; left:0.9in; right:0.9in; bottom:0.55in; font-size:8pt; letter-spacing:.04em; opacity:.4;
        display:flex; justify-content:space-between; }}
.note {{ font-size:9.5pt; line-height:1.55; opacity:.6; max-width:5.6in; }}
.note b {{ opacity:.9; }}
</style></head><body>

<!-- PAGE 1 — LIGHT -->
<section class="page light">
  <p class="ey">Brand <span class="acc">·</span> Logo</p>
  <h1>whosystems</h1>
  <p class="tag">One AI sales system. Built to book revenue.</p>

  <div class="block">
    <p class="cap">Primary lockup</p>
    <div class="hero l">{lockup_ink}</div>
  </div>

  <div class="block">
    <p class="cap">Mark &nbsp;/&nbsp; Wordmark</p>
    <div class="grid">
      <div class="cell l mk">{mark_dark}</div>
      <div class="cell l wd">{word_ink}</div>
    </div>
  </div>

  <div class="block">
    <p class="cap">Clear space &amp; minimum size</p>
    <p class="note">Keep clear space around the logo equal to the height of the green dot on all sides.
    Minimum size: <b>22&nbsp;px</b> tall for the mark on screen, <b>0.32&nbsp;in</b> in print.
    Never recolor, stretch, rotate, add effects, or place the dark mark on a busy background.</p>
  </div>

  <div class="foot"><span>WHOSYSTEMS</span><span>LOGO PACK · 2026</span></div>
</section>

<!-- PAGE 2 — DARK -->
<section class="page dark">
  <p class="ey">Reversed <span class="acc">·</span> On dark</p>
  <h1>whosystems</h1>
  <p class="tag">Use on near-black and dark photography.</p>

  <div class="block">
    <p class="cap">Primary lockup — reversed</p>
    <div class="hero d">{lockup_paper}</div>
  </div>

  <div class="block">
    <p class="cap">Mark &nbsp;/&nbsp; Wordmark — reversed</p>
    <div class="grid">
      <div class="cell d mk">{mark_light}</div>
      <div class="cell d wd">{word_paper}</div>
    </div>
  </div>

  <div class="block">
    <p class="cap">Color &amp; type</p>
    <div class="swatches">
      <div class="sw"><div class="chip" style="background:{INK}"></div><div class="meta"><b>Ink</b><span>#0C0E0D</span></div></div>
      <div class="sw"><div class="chip" style="background:{PAPER}"></div><div class="meta"><b>Paper</b><span>#F5F5F3</span></div></div>
      <div class="sw"><div class="chip" style="background:{ACCENT}"></div><div class="meta"><b>Green</b><span>#9BE15D</span></div></div>
      <div class="sw"><div class="chip" style="background:{ACCENT_DEEP}"></div><div class="meta"><b>Green deep</b><span>#5CA92E</span></div></div>
    </div>
    <p class="note" style="margin-top:16px">Typeface: <b>Instrument Sans</b> (700 for the wordmark &amp; headlines).
    Green is the accent — used sparingly. Green&nbsp;deep replaces the green dot on light backgrounds for contrast.</p>
  </div>

  <div class="foot" style="opacity:.35"><span>WHOSYSTEMS</span><span>LOGO PACK · 2026</span></div>
</section>

</body></html>"""

open("/tmp/logo_pack.html","w").write(html)
print("wrote /tmp/logo_pack.html")
