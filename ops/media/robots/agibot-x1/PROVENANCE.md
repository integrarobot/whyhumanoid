# X1 (AgiBot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** AgiBot's. No open licence is presumed. The site credits it as "Image: AgiBot".
- **Page:** https://www.agibot.com/products/X1
- **File:** https://cms-tos.agibot.com/legacy/agibot-en/en/public/static/index/en/images/prolx1One-img.png
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/agibot-x1/`.
- **Original:** `original.png`, 463 × 774 px, RGBA, 229,535 bytes, sha256 `78b8d30bad0ebb0984865a5c0a85a6a92f24eda6b34f4f666ab2887d222389b3` (equal to Codex's manifest).
- **Codex's preparation:** opaque or uneven original; Codex computed a non-generative mask (isnet-general-use via rembg), kept the original's RGB exactly and changed only alpha, crop and padding. Files `mask.png` and `prepared.png` (sha256 `5a7c86d1072c8613a73c32e8caa1202d1d7b3b3588f13f3df749b9d81fec7840`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 4, Lab "Agibot", Robot "X1".
- AGIBOT X1 (Lingxi X1), image of the X1 product page. Not X2 (145), A2 (143) nor G2 (146).

## Step here

`python3 ops/media/robots/refine.py ops/media/intake-ab-2026-11-27/batch-02/agibot-x1/prepared.png out.png --lo 0.35 --hi 0.9` (args in `refine-args.txt`, log in `refine-log.json`): matte levels on Codex's alpha only, to remove a soft halo and background haze at the edges that showed on the dark page; RGB untouched; crop with a 10 px margin.

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 2, PR 202, merge 14dedcd, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/agibot-x1/agibot-x1-full-body.png`, 331 × 687 px, lossless, sha256 `51d09966c2ebdcdee019fc10162eb9a3dfc144bae53d95b74c5ec4faa6c3f421`.
- **WebP:** `assets/robots/agibot-x1/agibot-x1-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `50747b6dbc75984ebc86b3a402dcc77c2b520fadd3658f51043f971756838fec`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
