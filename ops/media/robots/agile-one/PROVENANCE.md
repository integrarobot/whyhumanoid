# One (Agile): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 3, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** Agile Robots's. No open licence is presumed. The site credits it as "Image: Agile Robots".
- **Page:** https://www.agile-robots.com/en/products/humanoid-robots/agile-one/
- **File:** https://www.agile-robots.com/media/_processed_/3/6/csm_AgileRobots-AgileONE-Content-Pose-Front_66a5404261.png
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit eece0f8) and kept in `ops/media/intake-ab-2026-11-27/batch-03/agile-one/`.
- **Original:** `original.png`, 1280 × 875 px, RGBA, 167,535 bytes, sha256 `a7dcc93b04be39f21d6595281a9c36e461ddcdbf31ab36bd4c7ba4c5d64768de` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding); a distant ground shadow was masked out through alpha. Files `mask.png` and `prepared.png` (sha256 `a4c94c3841b9f31fcc918dc09af01bd3af6c09fb0d42d1e2c219eae4bba198dd`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 5, Lab "Agile", Robot "One".
- Agile ONE, front pose image of the official Agile ONE product page. Not the compact Agile ONE SN research variant (October 2026). Codex masked a distant ground shadow in the native alpha (beyond x 704, y 780); robot pixels unchanged.

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-03/agile-one/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; no scaling.

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 3, PR not yet merged)

- **PNG:** `assets/robots/agile-one/agile-one-full-body.png`, 265 × 756 px, lossless, sha256 `695abfbd5567af37952301a2fdb7407149fd26bebc30f3cd75f6f0dc7c31b70d`.
- **WebP:** `assets/robots/agile-one/agile-one-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `fffc114eb61acc1acfbe6d7e73d51ab4558411a7de82a1aae58c604225ca96d9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
