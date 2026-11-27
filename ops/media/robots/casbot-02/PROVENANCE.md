# CASBOT 02 (CASBOT): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** CASBOT's. No open licence is presumed. The site credits it as "Image: CASBOT".
- **Page:** https://casbot.tech/product/02
- **File:** https://casbot.tech/images/02/mobile/slice_2.png
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/casbot-02/`.
- **Original:** `original.png`, 1123 × 1988 px, RGBA, 779,821 bytes, sha256 `85af48fa37496445ee0c0f07bbf170b90b6965a8d0424d7d536149ba4c3bd767` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (alpha levels 85 to 230; components >=80 pixels; Moxi below row1810 excluded); crop ROI [0, 0, 1123, 1988], alpha bounding box [530, 318, 968, 1851], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `1633f1141f32dc6bf9954956d1ead74a9595909b868625e3a870ba6eff0acb92`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 167, Lab "CASBOT", Robot "CASBOT 02".
- The individual mobile hero image of the official CASBOT 02 page (not the group comparison). Bipedal; not CASBOT W1 (168).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 4, PR 208, merge e152f67, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/casbot-02/casbot-02-full-body.png`, 478 × 1573 px, sha256 `1633f1141f32dc6bf9954956d1ead74a9595909b868625e3a870ba6eff0acb92` (= Codex's prepared.png).
- **WebP:** `assets/robots/casbot-02/casbot-02-full-body.webp`, sha256 `44637a608b696080659115c37ba11b57d229757168ce597d7fe28083dcb2463f`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
