#!/usr/bin/env python3
import base64, time, subprocess, os, signal, sys, pychrome

HTML = "/tmp/oe.html"
OUT  = "/tmp/The-Operators-Edge.pdf"
GREEN="#9BE15D"; MUTED="#9CA19C"

chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
proc = subprocess.Popen(
    [chrome_bin, "--headless=new", "--disable-gpu", "--remote-debugging-port=9333",
     "--no-first-run", "--no-default-browser-check", "--user-data-dir=/tmp/oe_chrome_prof"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    time.sleep(2.5)
    browser = pychrome.Browser(url="http://127.0.0.1:9333")
    tab = browser.new_tab()
    tab.start()
    tab.Page.enable()
    tab.Network.enable()
    tab.Page.navigate(url="file://" + HTML)
    time.sleep(3.0)  # allow webfont fetch + layout
    # ensure fonts ready
    try:
        tab.Runtime.evaluate(expression="document.fonts.ready", awaitPromise=True)
    except Exception:
        pass
    time.sleep(1.0)

    footer = (
        f'<div style="font-family:Arial,sans-serif;font-size:7.5pt;color:{MUTED};'
        f'width:100%;padding:0 16mm;letter-spacing:.04em;'
        f'display:flex;justify-content:space-between;align-items:center;">'
        f'<span style="text-transform:uppercase;letter-spacing:.12em;">WhoSystems</span>'
        f'<span>The Operator\'s Edge &middot; AI + Sales</span>'
        f'<span class="pageNumber"></span>'
        f'</div>'
    )
    header = '<span></span>'

    # Pass 1: full doc with footer on every page (correct page numbers 1-9)
    full = tab.Page.printToPDF(
        printBackground=True, preferCSSPageSize=True,
        displayHeaderFooter=True, headerTemplate=header, footerTemplate=footer)
    open("/tmp/oe_full.pdf", "wb").write(base64.b64decode(full["data"]))

    # Pass 2: cover only, no footer
    cover = tab.Page.printToPDF(
        printBackground=True, preferCSSPageSize=True,
        displayHeaderFooter=False, pageRanges="1")
    open("/tmp/oe_cover.pdf", "wb").write(base64.b64decode(cover["data"]))

    # Merge: replace page 1 (footered) with the clean cover
    import fitz
    doc = fitz.open("/tmp/oe_full.pdf")
    doc.delete_page(0)
    cov = fitz.open("/tmp/oe_cover.pdf")
    doc.insert_pdf(cov, start_at=0)
    doc.set_metadata({"title": "The Operator's Edge — AI + Sales",
                      "author": "Shamrahh (RJ Jones)",
                      "subject": "A WhoSystems product"})
    doc.save(OUT, deflate=True, garbage=4)
    print("wrote", OUT, "pages:", doc.page_count)
    tab.stop()
    browser.close_tab(tab)
finally:
    proc.send_signal(signal.SIGTERM)
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
