# Quanta X2 (X Square): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** XSquare's. No open licence is presumed. The site credits it as "Image: X Square Robot, Quanta X2".
- **Page:** https://x2robot.com/en/product/quantum2
- **File:** https://x2robot-open.oss-cn-shenzhen.aliyuncs.com/quantum2_qiepian/x2_en/8.png
- **Context (Codex):** Exact Quantum2 product page navigation illustration. Whole platform. WARNING prepared alpha still removes part of actual dark face and retains a scan-grid line beside wrist; must correct alpha against original, or replace source. No invented RGB.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/x-square-quanta-x2/`.
- **Original:** `original.png`, 2760 × 1600 px, RGBA, 5,242,367 bytes, sha256 `573cfedb275b36ae6b123987685f5ad3350a5467ac2bc1d975c5745c3de6a222` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230; replaces Codex's ISNET cutout (dark face removed and a scan-grid line kept)); crop ROI [900, 600, 1450, 1590], alpha bounding box [35, 47, 468, 918], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `1ecb463cbde5f0143cfcd33f7243d515facd3f4218137837d82289f0f2cca17d`, mask sha256 `8dc87ab532484b678e9319e2cce342dfe1dd561d425bc3efa8ca3841241c4403`.

## Catalogue identity

- **Record:** catalogue id 101, Lab "X Square", Robot "Quanta X2".
- Navigation illustration of X Square Robot's Quantum 2 product page (the Quanta X2), the robot alone isolated from the scene. Alpha by Claude from a BiRefNet mask of the original (kept beside it), replacing a cutout that removed the dark face and kept a scan-grid line. The record is Quanta X2 (dexterous-hand configuration).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 10, PR not yet merged)

- **PNG:** `assets/robots/x-square-quanta-x2/x-square-quanta-x2-full-body.png`, 473 × 911 px, sha256 `1ecb463cbde5f0143cfcd33f7243d515facd3f4218137837d82289f0f2cca17d` (= the prepared.png).
- **WebP:** `assets/robots/x-square-quanta-x2/x-square-quanta-x2-full-body.webp`, sha256 `2c1b2dcc41e139546543f2b959b40c92c3215915043aacd8334f92d708355c65`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
