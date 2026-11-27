# CASBOT W1 (CASBOT): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** CASBOT's. No open licence is presumed. The site credits it as "Image: CASBOT".
- **Page:** https://casbot.tech/product/w1
- **File:** https://casbot.tech/images/w1/1.jpg
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/casbot-w1/`.
- **Original:** `original.jpg`, 2800 × 1080 px, RGB, 1,185,570 bytes, sha256 `20c48a33bc689a567028d0fc0c5086327f64a9661f995d36490536792de10c52` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (alpha levels 85 to 230; components >=80 pixels; Moxi below row1810 excluded); crop ROI [1100, 100, 1930, 1030], alpha bounding box [29, 71, 812, 873], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `edd560fbbc679bbd66d9c902f3bfa31ddec87d2e5950fa1df4c7c5177ca907da`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 168, Lab "CASBOT", Robot "CASBOT W1".
- Image of the official CASBOT W1 page; wheeled, with lifting column. Not CASBOT 02 (167).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 4, PR 208, merge e152f67, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/casbot-w1/casbot-w1-full-body.png`, 823 × 842 px, sha256 `edd560fbbc679bbd66d9c902f3bfa31ddec87d2e5950fa1df4c7c5177ca907da` (= Codex's prepared.png).
- **WebP:** `assets/robots/casbot-w1/casbot-w1-full-body.webp`, sha256 `abe934e35bbc9b9d0bb4c97228a63c2a3fa6f05d1ba123d8ebbb92cafb17bf01`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
