# Vega (Dexmate): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Dexmate's. No open licence is presumed. The site credits it as "Image: Dexmate".
- **Page:** https://www.dexmate.com/product/vega-1-pro
- **File:** https://cdn.sanity.io/images/b8xzly2c/production/345e4a1cd27c55f27ea4a88c873bb5af657d92cc-1500x1500.png
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/vega/`.
- **Original:** `original.png`, 1500 × 1500 px, RGBA, 717,165 bytes, sha256 `b0949f4809eaeb47577da00c38e92643206488371f35909990a39d6ec3d5aedf` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (alpha levels 85 to 230; components >=80 pixels; Moxi below row1810 excluded); crop ROI [0, 0, 1500, 1500], alpha bounding box [483, 87, 1029, 1413], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `659f5c8da5c3ad105903edaf0a219520fe6ae7460ad99c6f8bbc5418827f1c72`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 22, Lab "Dexmate", Robot "Vega".
- Image of the official Vega 1 Pro product page (mobile configuration, image alt "Vega_01"); not the bench-mounted Vega 1 U.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 4, PR 208, merge e152f67, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/dexmate-vega/dexmate-vega-full-body.png`, 586 × 1366 px, sha256 `659f5c8da5c3ad105903edaf0a219520fe6ae7460ad99c6f8bbc5418827f1c72` (= Codex's prepared.png).
- **WebP:** `assets/robots/dexmate-vega/dexmate-vega-full-body.webp`, sha256 `d1bd3e0fe08f5fe04c98e22a942db4176741d7f6b2ec613b21b1810bc8804715`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
