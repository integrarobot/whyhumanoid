# A2 (A2 Ultra / A2 Lite) (AgiBot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** AgiBot's. No open licence is presumed. The site credits it as "Image: AgiBot".
- **Page:** https://store.agibot.com/products/a2-ultra
- **File:** https://store.agibot.com/cdn/shop/files/2_ff0f068b-3ddd-497c-91dc-341a24cdc2c2.png?v=1766128167
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/agibot-a2/`.
- **Original:** `original.png`, 2000 × 2000 px, RGBA, 1,011,929 bytes, sha256 `8c3003338111504b746680e859d90c6717d8f0ab88c12a1d89722b17f4762e59` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding). Files `mask.png` and `prepared.png` (sha256 `4a4e069ae4a62084ce73fcd5154c296020d67ace3b8904cfa259a8a44b0b18c8`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 143, Lab "Agibot", Robot "A2 (A2 Ultra / A2 Lite)".
- The record covers A2 Ultra and A2 Lite. This image is the A2 Ultra, from the official store page for the A2 Ultra; it is not presented as the A2 Lite. The technical A2 image with labels was excluded (Codex).

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-02/agibot-a2/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; native resolution kept (no scaling).

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 2, PR 202, merge 14dedcd, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/agibot-a2/agibot-a2-full-body.png`, 804 × 1736 px, lossless, sha256 `c78d211e580d6f47779c79f9d590c349e18959eea25174d03bc9a8d0917152a6`.
- **WebP:** `assets/robots/agibot-a2/agibot-a2-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `a705f4925caac35f584bbc23e256c05d982ada18068cea2237a01ab34495d7c9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
