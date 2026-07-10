# The Operator's Edge — lead magnet

`The-Operators-Edge.pdf` is the distributed PDF (9 pages). This version was
re-rendered to be **brand-consistent** with the whosystems logo and site:

- Logo swapped to the **canonical mark** (matches the favicon / site nav — a
  hairline border keeps the ink square visible on the near-black cover).
- Green corrected `#7ED957` → **`#9BE15D`** (brand accent).
- Background `#0A0B0D` → **`#0C0E0D`** (brand ink); white → **`#F5F5F3`** (paper).
- Typeface switched to **Instrument Sans** (the brand font).
- Page footer with page numbers retained; cover stays clean.

The previous file is kept as `The-Operators-Edge-ORIGINAL.pdf` in iCloud.

## Rebuild

```
python build_oe_html.py     # markdown -> /tmp/oe.html (brand-styled)
python render_oe.py         # headless Chrome -> /tmp/The-Operators-Edge.pdf
```

`render_oe.py` needs `pychrome` + `pymupdf` and prints via headless Chrome
(it renders the full doc with footers, then swaps in a footer-free cover).
Edit copy in `operators-edge-product.md`.
