# G1 (AgiBot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** AgiBot's. No open licence is presumed. The site credits it as "Image: AgiBot".
- **Page:** https://www.agibot.com/products/G1
- **File:** https://cms-tos.agibot.com/legacy/agibot-en/en/public/static/index/en/images/pro-A2D/proA2DOne-img.png
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/agibot-g1/`.
- **Original:** `original.png`, 764 × 1200 px, RGBA, 601,627 bytes, sha256 `fc0a4c3735ed0a7df65ff13c574f3ecbcf27e461c4ea1d06e59ebf71328911ea` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding). Files `mask.png` and `prepared.png` (sha256 `f4baed89b34c9606fb52d9960fc241d723d5bc97d722359bf0262b7c8c3dc0b4`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 147, Lab "Agibot", Robot "G1".
- AGIBOT G1, wheeled dual-arm robot, image of the official G1 product page; the file path names "pro-A2D" (to be confirmed by Codex as the G1 product image). Not Unitree G1 (138) nor Galbot G1 (35). In the original the robot reaches the right and bottom edges; the base is shown whole and no detail is added beyond the original.

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-02/agibot-g1/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; native resolution kept (no scaling).

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 2, PR not yet merged)

- **PNG:** `assets/robots/agibot-g1/agibot-g1-full-body.png`, 775 × 1203 px, lossless, sha256 `ea311c3a1800a254ea68d95ac95f8cb589506a139d2319d13468372fd74cb70e`.
- **WebP:** `assets/robots/agibot-g1/agibot-g1-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `16e57ca63417f24a107371de67f9b75bc49356e8376fdadb1cfd3b00b48b1b24`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
