# whosystems — brand / logo assets

Distribution-ready logo files. Colors and proportions match the live site
(`site/assets/css/main.css`, `site/assets/img/`).

## What to send people

- **`whosystems-logo-pack.pdf`** — the one file to hand to a designer, printer,
  or partner. Two pages (light + reversed) with the lockup, mark, wordmark,
  color palette, type, and usage rules. Vector, opens everywhere.
- **SVGs** — use these for anything digital or editable (web, slides, app icons,
  re-coloring in Figma/Illustrator). Vector, infinitely scalable.

## Files

| File | What it is | Use on |
|------|------------|--------|
| `whosystems-lockup-ink.svg`     | Mark + wordmark (primary)        | light backgrounds |
| `whosystems-lockup-paper.svg`   | Mark + wordmark (reversed)       | dark backgrounds |
| `whosystems-mark-dark.svg`      | "w" mark, dark square            | light backgrounds / app icon |
| `whosystems-mark-light.svg`     | "w" mark, light square           | dark backgrounds |
| `whosystems-wordmark-ink.svg`   | "whosystems" wordmark            | light backgrounds |
| `whosystems-wordmark-paper.svg` | "whosystems" wordmark            | dark backgrounds |
| `whosystems-logo-pack.pdf`      | All of the above + brand sheet   | sending / printing |

The wordmark is outlined to vector paths, so it renders correctly even where
the brand font isn't installed.

## Colors

| Token | Hex | Use |
|-------|-----|-----|
| Ink        | `#0C0E0D` | near-black — mark square, dark backgrounds |
| Paper      | `#F5F5F3` | off-white — light backgrounds, reversed type |
| Green      | `#9BE15D` | accent — the dot; use sparingly |
| Green deep | `#5CA92E` | the dot on light backgrounds (contrast) |

## Type

**Instrument Sans** — 700 weight for the wordmark and headlines.

## Rules

- Keep clear space around the logo ≥ the height of the green dot.
- Minimum size: mark 22 px tall (screen) / 0.32 in (print).
- Don't recolor, stretch, rotate, add shadows, or place the dark mark on a busy
  background. Use the reversed files on dark surfaces.

## Regenerating

Sources live in `_src/`. The SVGs and PDF are produced by:

```
python _src/build_wordmark.py > _src/wordmark.json   # outline the wordmark
python _src/gen_brand_svgs.py                          # write the SVGs
python _src/gen_logo_pack.py                           # write logo_pack HTML
# then print logo_pack.html to PDF with headless Chrome
```
