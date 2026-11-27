# One (Argon): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 3, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** Argon's. No open licence is presumed. The site credits it as "Image: Argon".
- **Page:** https://www.argonmech.com/
- **File:** https://cdn.prod.website-files.com/684893e9d670283aee10ad61/6a42e561679b4bd62e9e5b75_argon-one-render-website%201v3.png
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit eece0f8) and kept in `ops/media/intake-ab-2026-11-27/batch-03/argon-one/`.
- **Original:** `original.png`, 1865 × 1865 px, RGBA, 386,270 bytes, sha256 `ad1558f22ee2d7773b491677897226f77ff434d39f9abb1b192f3d3b98c7b6a5` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding). Files `mask.png` and `prepared.png` (sha256 `7dd9a4f88c820293d629c29674495ab5fa5d630ad117ea3876fe8585b3f94b1b`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 8, Lab "Argon", Robot "One".
- Argon One render from the official Argon site (argonmech.com).

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-03/argon-one/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; no scaling.

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 3, PR 206, merge c015cef, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/argon-one/argon-one-full-body.png`, 736 × 1709 px, lossless, sha256 `1e0f7c7f9de86e11fedd79fabef875bb6eb50982c3ef9ba39e3912d020cac9a9`.
- **WebP:** `assets/robots/argon-one/argon-one-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `84259317018f0d0db20f7a0e69bf4dc00e9b12cf1d2ac0fa2d5956735ddec05a`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
