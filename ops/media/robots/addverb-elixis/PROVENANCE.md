# Elixis (Addverb): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 3, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** Addverb's. No open licence is presumed. The site credits it as "Image: Addverb".
- **Page:** https://addverb.ai/humanoid-robot-elixis
- **File:** https://framerusercontent.com/images/h7Dzkq6l1Squ3SEWzTYtF4NagR4.png?height=1080&width=1080
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit eece0f8) and kept in `ops/media/intake-ab-2026-11-27/batch-03/addverb-elixis/`.
- **Original:** `original.png`, 1080 × 1080 px, P, 96,369 bytes, sha256 `eaa5b6e90a5cc6739521b5540583222adad6a77fc03f5b813a965286931c4229` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding). Files `mask.png` and `prepared.png` (sha256 `e9a12a5b7ef75f1fd92df5895daa75a829e6e9930df19ded0a4b9190df4bc103`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 105, Lab "Addverb", Robot "Elixis".
- Native-alpha image linked in the technical comparison section of the official Elixis page, under ELIXIS biped; not Elixis-W (wheeled).

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-03/addverb-elixis/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; no scaling.

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 3, PR not yet merged)

- **PNG:** `assets/robots/addverb-elixis/addverb-elixis-full-body.png`, 323 × 999 px, lossless, sha256 `a318951fbb59db2c93029acd3c39c1241e2373192ee693deea639a0bfd230ccb`.
- **WebP:** `assets/robots/addverb-elixis/addverb-elixis-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `040e6b24adcbe5ee87c3f944d9d1e01d1e8e47c5dcd43686d5b8909c8ed3d952`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
