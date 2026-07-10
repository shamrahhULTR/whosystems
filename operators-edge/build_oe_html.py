#!/usr/bin/env python3
import markdown, os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "operators-edge-product.md")
OUT = "/tmp/oe.html"

# ---- Brand tokens (from whosystems site main.css) ----
GREEN   = "#9BE15D"   # accent (was #7ED957)
GREEN_D = "#5CA92E"   # accent-deep
BG      = "#0C0E0D"   # ink (was #0A0B0D)
PANEL   = "#191C1A"   # dark bg-card (was #15181C)
LINE    = "#2B2E2C"   # dark --line
MUTED   = "#9CA19C"   # dark --muted-deep (was #9AA1AA)
WHITE   = "#F5F5F3"   # paper (was #F4F5F2)
BODY    = "#D8DAD5"   # dark --ink-soft

with open(SRC) as f:
    md = f.read()

body_md = md.split("---", 1)[1].lstrip()
html_body = markdown.markdown(body_md, extensions=["extra", "sane_lists"])
html_body = html_body.replace("[YOUR TURN]", '<span class="yt">[YOUR TURN]</span>')

# Canonical WhoSystems mark (matches favicon / site nav), viewBox 0 0 96 96.
# Hairline border so the ink square reads on the near-black cover (brand uses
# subtle white-alpha borders on dark surfaces).
LOGO = f"""
<svg class="logo" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect x="0.75" y="0.75" width="94.5" height="94.5" rx="25.5" fill="{BG}"
        stroke="rgba(245,245,243,0.14)" stroke-width="1.5"/>
  <path d="M21 36 L33.5 64 L47 40 L58.5 64 L71 31" fill="none" stroke="{WHITE}"
        stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="76.5" cy="20.5" r="5.5" fill="{GREEN}"/>
</svg>
"""

css = f"""
@import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700;800&display=swap');
@page {{ size: Letter; margin: 18mm 16mm 16mm 16mm; }}
@page :first {{ margin: 0; }}

* {{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
html {{ background: {BG}; }}
body {{ font-family: 'Instrument Sans', -apple-system, Arial, sans-serif; color: {WHITE};
  font-size: 10.5pt; line-height: 1.62; background: {BG}; margin: 0; }}

/* ---------- COVER ---------- */
.cover {{ background: {BG}; min-height: 100vh; padding: 30mm 20mm; page-break-after: always; }}
.cover .logo {{ width: 60px; height: 60px; border-radius: 17px; margin-bottom: 58px; display:block; }}
.cover .kicker {{ color: {GREEN}; font-size: 10.5pt; letter-spacing: .34em; text-transform: uppercase; font-weight: 700; margin-bottom: 14px; }}
.cover h1 {{ font-size: 54pt; line-height: 1.0; margin: 0; font-weight: 800; letter-spacing: -.03em; color: {WHITE}; border: none; padding: 0; }}
.cover h1 .g {{ color: {GREEN}; }}
.cover .rule {{ width: 64px; height: 5px; background: {GREEN}; margin: 26px 0; border-radius: 3px; }}
.cover .sub {{ font-size: 13.5pt; color: {MUTED}; max-width: 135mm; line-height: 1.5; }}
.stats {{ display: flex; gap: 26px; margin-top: 46px; }}
.stat {{ flex: 1; border-top: 2px solid {LINE}; padding-top: 12px; }}
.stat .num {{ font-size: 21pt; font-weight: 800; color: {WHITE}; letter-spacing: -.02em; }}
.stat .num .g {{ color: {GREEN}; }}
.stat .lbl {{ font-size: 7.5pt; color: {MUTED}; letter-spacing: .14em; text-transform: uppercase; margin-top: 5px; }}
.cover .by {{ margin-top: 52px; font-size: 11pt; color: {MUTED}; }}
.cover .by strong {{ color: {WHITE}; }}

/* ---------- BODY ---------- */
h1 {{ font-size: 23pt; font-weight: 800; letter-spacing: -.02em; margin: 34px 0 4px; color: {WHITE};
  border-bottom: 3px solid {GREEN}; padding-bottom: 10px; page-break-after: avoid; }}
h2 {{ font-size: 14.5pt; font-weight: 700; letter-spacing: -.01em; margin: 26px 0 6px; color: {WHITE}; page-break-after: avoid; }}
h3 {{ font-size: 12pt; font-weight: 700; margin: 20px 0 4px; color: {GREEN}; letter-spacing: .01em; page-break-after: avoid; }}
p {{ margin: 8px 0; color: {BODY}; }}
ul, ol {{ margin: 8px 0; padding-left: 20px; color: {BODY}; }}
li {{ margin: 4px 0; }}
li::marker {{ color: {GREEN}; }}
strong {{ color: {WHITE}; font-weight: 700; }}

blockquote {{ margin: 12px 0; padding: 12px 18px; background: {PANEL};
  border-left: 4px solid {GREEN}; border-radius: 8px; color: {BODY}; font-style: italic; }}
blockquote p {{ margin: 0; color: {BODY}; }}

.yt {{ color: {GREEN}; font-weight: 800; letter-spacing: .01em; }}

hr {{ border: none; border-top: 1px solid {LINE}; margin: 30px 0; }}
code {{ background: {PANEL}; padding: 1px 5px; border-radius: 4px; font-size: 9.5pt; color: {GREEN}; }}
"""

cover = f"""
<div class="cover">
  {LOGO}
  <div class="kicker">The Operator's Edge</div>
  <h1>AI <span class="g">+</span> Sales</h1>
  <div class="rule"></div>
  <div class="sub">How to close high-ticket deals and use AI to produce income. No theory. The exact moves.</div>
  <div class="stats">
    <div class="stat"><div class="num"><span class="g">$28M+</span></div><div class="lbl">Career sales volume</div></div>
    <div class="stat"><div class="num">5 industries</div><div class="lbl">No degree &middot; #1 closer</div></div>
    <div class="stat"><div class="num">1 system</div><div class="lbl">The F.R.A.M.E. Method</div></div>
  </div>
  <div class="by">By <strong>Shamrahh (RJ Jones)</strong> &nbsp;&middot;&nbsp; A WhoSystems product</div>
</div>
"""

full = f"<!doctype html><html><head><meta charset='utf-8'><style>{css}</style></head><body>{cover}{html_body}</body></html>"
open(OUT, "w").write(full)
print("wrote", OUT, len(full), "bytes")
