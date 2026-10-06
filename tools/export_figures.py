#!/usr/bin/env python3
"""Render the paper's figure PDFs in source/figures/ into web images in static/images/.

Run after replacing a figure PDF:
    python3 tools/export_figures.py

Needs PyMuPDF (pip install pymupdf). Browsers cannot show a PDF in an <img>,
so each figure is rasterised once here; the PDFs in source/ stay the originals.

Photo-heavy figures go to JPEG (small files, video frames compress well); the
architecture diagram goes to PNG so its text and thin lines stay crisp.
"""
import os
import sys

try:
    import pymupdf
except ImportError:
    sys.exit("PyMuPDF is required: pip install pymupdf")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "source", "figures")
OUT = os.path.join(ROOT, "static", "images")

# Rendered width in pixels: about 2x the widest the page ever shows a figure
# (the 980px text column), so figures stay sharp on high-DPI screens.
WIDTH = 2000

# source PDF -> output image (extension picks the format)
FIGURES = {
    "main_arch.pdf": "method.png",              # Figure 2
    "main_qual_long.pdf": "long_video.jpg",     # Figure 3
    "interactive_qual.pdf": "interactive.jpg",  # Figure 4a
    "mad_paper_relative.pdf": "anchor_plot.png",  # Figure 4b
}

JPEG_QUALITY = 88


def export(src, dst):
    page = pymupdf.open(src)[0]
    zoom = WIDTH / page.rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
    if dst.lower().endswith((".jpg", ".jpeg")):
        pix.save(dst, jpg_quality=JPEG_QUALITY)
    else:
        pix.save(dst)
    return pix.width, pix.height


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, out in FIGURES.items():
        src = os.path.join(SRC, name)
        if not os.path.exists(src):
            print(f"skip {name}: not in source/figures/")
            continue
        dst = os.path.join(OUT, out)
        w, h = export(src, dst)
        print(f"{name} -> static/images/{out}  {w}x{h}  {os.path.getsize(dst) / 1e3:.0f} KB")


if __name__ == "__main__":
    main()
