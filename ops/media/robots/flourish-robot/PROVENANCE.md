# Flourish robot (model name unconfirmed) (Flourish): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Flourish's. No open licence is presumed. The site credits it as "Image: Flourish".
- **Page:** https://flourish-robots.com/
- **File:** https://framerusercontent.com/images/gDyKs7ERxGbJEVUpekIf1uznZeg.jpg
- **Context (Codex):** Flourish robot as shown by its manufacturer; model name unconfirmed. Complete green wheeled platform from current official homepage. Do not invent a commercial model name or update catalogue data.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 2daba0a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/flourish/`.
- **Original:** `original.jpg`, 4320 × 6464 px, RGB, 611,734 bytes, sha256 `857336605acbb53b599d02f3921828c8698d7075e3d1bc41d506d5aaa7ddc486` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small background components removed. Alpha-only boundary exclusion of wall halo above original row8.); crop ROI [0, 0, 4320, 6464], alpha bounding box [1349, 8, 2848, 5956], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `40284a003fda4f14f954cbb1ea04fb93faa074c7178a9e374608245b65ef2986`) and the mask (sha256 `2877fa85e9daa7831c3ad6e318c697530962de929b4694dc7f647113d9eff665`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 129, Lab "Flourish", Robot "Flourish robot (model name unconfirmed)".
- The robot Flourish shows on its current official homepage: the complete green wheeled platform. The record has no confirmed model name, and none is given here (Codex, 27 Nov 2026: eligible as the maker's robot, without a commercial name).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 6, PR not yet merged)

- **PNG:** `assets/robots/flourish-robot/flourish-robot-full-body.png`, 1539 × 5988 px, sha256 `40284a003fda4f14f954cbb1ea04fb93faa074c7178a9e374608245b65ef2986` (= Codex's prepared.png).
- **WebP:** `assets/robots/flourish-robot/flourish-robot-full-body.webp`, sha256 `6033cb1c330b09e01813cbffb76a684d55aeee8c706fd041c2ace9a6aee2d3ea`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
