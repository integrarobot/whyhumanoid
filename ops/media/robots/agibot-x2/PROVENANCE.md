# X2 (X2 Neo / X2 Ultra) (AgiBot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** AgiBot's. No open licence is presumed. The site credits it as "Image: AgiBot".
- **Page:** https://www.agibot.com/products/X2
- **File:** https://cms-tos.agibot.com/content/x2-refresh-20261111/19b63d0568b73e7e7f385f49.webp
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/agibot-x2/`.
- **Original:** `original.webp`, 500 × 940 px, RGBA, 86,592 bytes, sha256 `19b63d0568b73e7e7f385f49a9a01cd7e1d76a1084cc68ecf399bd1cbf60ec1d` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding). Files `mask.png` and `prepared.png` (sha256 `689a18d8eda5c2ec40f9e4aedac73b33286582d6c2b5963491f889eb86431067`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 145, Lab "Agibot", Robot "X2 (X2 Neo / X2 Ultra)".
- The record covers X2 Neo and X2 Ultra. This image is the X2 Ultra, front view (Codex); it is not presented as the X2 Neo.

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-02/agibot-x2/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; native resolution kept (no scaling).

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 2, PR 202, merge 14dedcd, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/agibot-x2/agibot-x2-full-body.png`, 454 × 920 px, lossless, sha256 `4b012ef4790f8ab2a20be46006e603aac971e57545c02a4c6b6bc81a853fddcd`.
- **WebP:** `assets/robots/agibot-x2/agibot-x2-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `f3a160ab043b11cec126082e696d2e1049fa937a534076bc220a0840f01cb807`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
