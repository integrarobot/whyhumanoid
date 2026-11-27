# Codroid 02 (Estun Codroid): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Estun Codroid's. No open licence is presumed. The site credits it as "Image: Estun Codroid".
- **Page:** https://www.codroid.ai/en/
- **File:** https://www.codroid.ai/uploads/c02.png
- **Context (Codex):** CODROID02 bipedal version with both legs and feet; not wheeled.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 2daba0a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/codroid-02/`.
- **Original:** `original.png`, 469 × 1081 px, RGBA, 411,971 bytes, sha256 `c272849ac2a5bb3ae099858a164f0dd9e91e76cf109227876c50e196b8cc888c` (equal to Codex's manifest).
- **Codex's preparation:** original with its own transparency; non-generative alpha mask (Alpha levels85..230; small background components removed.); crop ROI [0, 0, 469, 1081], alpha bounding box [57, 20, 456, 1081], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `7bccfcd6feac881aeb5d5eaa5a5ed36778ff0eb2f89cfb3e1eec8cc7ddae164d`) and the mask (sha256 `2af86b6626d2902f947786de16f5d92305f8b2c9b2da22514573fcfd2249c310`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 29, Lab "Estun Codroid", Robot "Codroid 02".
- Codroid 02 from Estun Codroid's official site (file c02.png): the bipedal version, with both legs and feet; not the wheeled version and not Codroid 01.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 6, PR not yet merged)

- **PNG:** `assets/robots/estun-codroid-02/estun-codroid-02-full-body.png`, 439 × 1101 px, sha256 `7bccfcd6feac881aeb5d5eaa5a5ed36778ff0eb2f89cfb3e1eec8cc7ddae164d` (= Codex's prepared.png).
- **WebP:** `assets/robots/estun-codroid-02/estun-codroid-02-full-body.webp`, sha256 `7abe7e31414260f5983396209a24269be5b3427828cdb877da5318a4edef7da5`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
