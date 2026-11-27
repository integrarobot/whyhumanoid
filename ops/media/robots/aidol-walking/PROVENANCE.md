# AIDOL (walking version) (AIDOL): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 3, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** AIDOL's. No open licence is presumed. The site credits it as "Image: AIDOL".
- **Page:** https://aidoltech.ru/
- **File:** https://static.tildacdn.com/tild6363-3666-4637-a534-633737613466/main-card-walk.png
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit eece0f8) and kept in `ops/media/intake-ab-2026-11-27/batch-03/aidol-walking/`.
- **Original:** `original.png`, 418 × 522 px, RGBA, 86,073 bytes, sha256 `9d97605cd2c93724220da1e212d021df8f2d8265601328f57c7565c76b9645a0` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding). Files `mask.png` and `prepared.png` (sha256 `b0993547f280fd2725253231dbb45f02a52392892c03947f782bb2ee1e757c49`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 164, Lab "AIDOL", Robot "AIDOL (walking version)".
- The walking card image of the official AIDOL site; not the desktop (upper-body) version.

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-03/aidol-walking/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; no scaling.

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 3, PR not yet merged)

- **PNG:** `assets/robots/aidol-walking/aidol-walking-full-body.png`, 287 × 520 px, lossless, sha256 `9d901a47af1fec21fb060d9b4237ec11432d16ddd8188647585059238ae15494`.
- **WebP:** `assets/robots/aidol-walking/aidol-walking-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `1ea70266bb11132f9f23554a1e2f7de4ea460a7ac6abdbd6a06ef296b3cd48c5`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
