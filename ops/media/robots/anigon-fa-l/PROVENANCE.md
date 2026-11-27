# FA-L Series (Anigon): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** Anigon's. No open licence is presumed. The site credits it as "Image: Anigon".
- **Page:** https://anigon.ch/
- **File:** https://anigon.ch/images/robot-front.png
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/anigon-fa-l/`.
- **Original:** `original.png`, 820 × 2048 px, RGBA, 736,518 bytes, sha256 `5c4bba4b7cf8556c7af342ae096ec7b3ac47f7e507c5fae23f734fb1bd487150` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding). Files `mask.png` and `prepared.png` (sha256 `d4eb356c0f72b96b8569c90219a5876bc994593e33041e4c5a24792f7238bf7e`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 165, Lab "Anigon", Robot "FA-L Series".
- ANIGON FA-L series wheeled humanoid platform, front image of the maker's site.

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-02/anigon-fa-l/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; native resolution kept (no scaling).

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 2, PR not yet merged)

- **PNG:** `assets/robots/anigon-fa-l/anigon-fa-l-full-body.png`, 753 × 2044 px, lossless, sha256 `1c356c4592f138ee3246c076f0d774a7015b4cc0640d18978638d071217b8451`.
- **WebP:** `assets/robots/anigon-fa-l/anigon-fa-l-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `0cf67d6af4d8539cc9adfaeb91b390f99558495aa1316b3a8dee9b1b6a30720f`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
