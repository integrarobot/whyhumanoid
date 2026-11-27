# Kengo (Galaxea): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Galaxea Dynamics's. No open licence is presumed. The site credits it as "Image: Galaxea Dynamics".
- **Page:** https://galaxea-dynamics.com/products/galaxea-kengo-proprietary-embodied-ai-bipedal-robot
- **File:** https://galaxea-dynamics.com/cdn/shop/files/Kengo-Main-Blue.jpg
- **Context (Codex):** Kengo blue-grey front view isolated from front/back comparison in official Kengo product gallery. Both hands and feet complete.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/galaxea-kengo/`.
- **Original:** `original.jpg`, 3200 × 3200 px, RGB, 296,676 bytes, sha256 `6868134b18702d9f31d021be56fefb75be8c7e4834c3bc9a7e20cb4a24c41e8c` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small isolated background components excluded; RGB unchanged. Alpha-only excludes floor reflection below source row2838. Review correction: remaining right shoe floor reflection excluded in alpha.); crop ROI [720, 400, 1630, 2890], alpha bounding box [70, 44, 838, 2438], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `12253e050b58a10bba4ff82fcdafcae85bb4f9bf25d07c40589c0aa8b88a158b`) and the mask (sha256 `988000bed0e32c94474e678ed9f18501cc4e6f60d67b208f7f3a74584fa21cfc`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 161, Lab "Galaxea", Robot "Kengo".
- Kengo, Galaxea's bipedal robot, front view isolated from the front-and-back image in the official Kengo product gallery (Kengo-Main-Blue.jpg); both hands and feet whole. Not an R1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 7, PR 225, merge 8b33837, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/galaxea-kengo/galaxea-kengo-full-body.png`, 808 × 2434 px, sha256 `12253e050b58a10bba4ff82fcdafcae85bb4f9bf25d07c40589c0aa8b88a158b` (= Codex's prepared.png).
- **WebP:** `assets/robots/galaxea-kengo/galaxea-kengo-full-body.webp`, sha256 `9e9b3138d7fcdbce24344fcf451cb6a50b503d06b5839d7f65a48d9951f591db`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
