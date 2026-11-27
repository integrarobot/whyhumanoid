# A3 (AgiBot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** AgiBot's. No open licence is presumed. The site credits it as "Image: AgiBot".
- **Page:** https://store.agibot.com/products/a3
- **File:** https://store.agibot.com/cdn/shop/files/1_1.png?v=1786349615
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/agibot-a3/`.
- **Original:** `original.png`, 800 × 800 px, RGBA, 113,728 bytes, sha256 `9b1af46a6b3cc368bc29332cd24e051bb0e7f7ddf0bf9ece09d7332534983cd5` (equal to Codex's manifest).
- **Codex's preparation:** opaque or uneven original; Codex computed a non-generative mask (isnet-general-use via rembg), kept the original's RGB exactly and changed only alpha, crop and padding. Files `mask.png` and `prepared.png` (sha256 `83e488a3ba6973ccd3a1b2892926d438fb7507e63bb06d2ec025eac25945f38c`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 144, Lab "Agibot", Robot "A3".
- AGIBOT A3 (base), from the official store page for the A3. Not A2 (143).

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-02/agibot-a3/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; native resolution kept (no scaling).

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 2, PR 202, merge 14dedcd, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/agibot-a3/agibot-a3-full-body.png`, 230 × 696 px, lossless, sha256 `cb40529e18b0e36b95cd6f185d42ff03010a22773f63edaf99d73146542f026c`.
- **WebP:** `assets/robots/agibot-a3/agibot-a3-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `3915359e2bbed7621ee11bbbd546779542172ca97c19b546f05350808d279483`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
