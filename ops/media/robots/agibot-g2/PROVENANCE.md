# G2 (AgiBot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** AgiBot's. No open licence is presumed. The site credits it as "Image: AgiBot".
- **Page:** https://www.agibot.com/products/G2. The file is the render linked to G2 in the official site navigation: in the official HTML it sits inside a link `href=/products/G2` labelled "AGIBOT G2" (Codex, 27 Nov 2026). Codex first downloaded it from that global navigation while on the X1 page; the intake record keeps that history (`source_page` /products/X1), which is not the identity.
- **File:** https://cms-tos.agibot.com/legacy/agibot-en/en/public/uploads/images/20251031/afa47f3a6d43c28b95a1534ed8310ad7.png
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/agibot-g2/`.
- **Original:** `original.png`, 467 × 855 px, RGBA, 357,298 bytes, sha256 `a64e93dc03f304505c4fa01e5f55d43886ee48221d854d09b33813662775e2d5` (equal to Codex's manifest).
- **Codex's preparation:** opaque or uneven original; Codex computed a non-generative mask (isnet-general-use via rembg), kept the original's RGB exactly and changed only alpha, crop and padding. Files `mask.png` and `prepared.png` (sha256 `d108314cb6093f9bcbefa89779773ba61079e80a1291c3107592a7ce7add20ca`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 146, Lab "Agibot", Robot "G2".
- AGIBOT G2, large technical photograph. Not G1 (147). Identity confirmed by Codex from the G2 link and label in the official navigation.

## Step here

`python3 ops/media/robots/refine.py ops/media/intake-ab-2026-11-27/batch-02/agibot-g2/prepared.png out.png --lo 0.35 --hi 0.9` (args in `refine-args.txt`, log in `refine-log.json`): matte levels on Codex's alpha only, to remove a soft halo and background haze at the edges that showed on the dark page; RGB untouched; crop with a 10 px margin.

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 2, PR not yet merged)

- **PNG:** `assets/robots/agibot-g2/agibot-g2-full-body.png`, 309 × 821 px, lossless, sha256 `14629aa959c7a2cb61fa403b1c56193060c7bc2a838f6bc29749530e09842894`.
- **WebP:** `assets/robots/agibot-g2/agibot-g2-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `1921ee2e2fd122318aa0eeb363ebd1f5acb84e4e06577d1e1ca997c743c51acb`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
