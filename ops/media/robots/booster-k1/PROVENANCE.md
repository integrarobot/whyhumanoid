# K1 (Booster Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** Booster Robotics's. No open licence is presumed. The site credits it as "Image: Booster Robotics".
- **Page:** https://www.booster.tech/booster-k1
- **File:** https://fe-cdn.booster.tech/booster-official-website/release-0.1.22/_astro/robot-k1.Bjwl1Psx.webp
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/booster-k1/`.
- **Original:** `original.webp`, 1200 × 1448 px, RGB, 36,230 bytes, sha256 `e23869dc8c56b34946d797ce73bcb66fdecece09fa67fe27f602c3f0721470f9` (equal to Codex's manifest).
- **Codex's preparation:** opaque or uneven original; Codex computed a non-generative mask (isnet-general-use via rembg), kept the original's RGB exactly and changed only alpha, crop and padding. Files `mask.png` and `prepared.png` (sha256 `3aa284721c59b15d94ce281d3bd572b678bc6cdb4d681c0ba8e4046573b83e82`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 149, Lab "Booster", Robot "K1".
- Booster K1, the navigation image of the official K1 page (opaque, with a ball). Mask cutout by Codex (isnet-general-use), colour unchanged; the separate ball was removed through alpha only. Not T1 (14), T2 (148) nor Kepler K1 (47).

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-02/booster-k1/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; native resolution kept (no scaling).

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 2, PR not yet merged)

- **PNG:** `assets/robots/booster-k1/booster-k1-full-body.png`, 744 × 776 px, lossless, sha256 `cae94cc641038466d7db1cef06b9cf8d55844967a526b925e2a494a23ec4a7d5`.
- **WebP:** `assets/robots/booster-k1/booster-k1-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `c08f90430d52a602597b82b884b4e56a39c9e4b8dc3a0e0a85bc3fd0ab1fd2bf`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
