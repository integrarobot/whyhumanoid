# Sprout (Fauna): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Fauna Robotics's. No open licence is presumed. The site credits it as "Image: Fauna Robotics".
- **Page:** https://faunarobotics.com/product
- **File:** https://cdn.prod.website-files.com/693933367980a29f6ff36b6d/6968af350a9679264eb0d177_Shot%201.avif
- **Context (Codex):** Sprout Creator Edition, complete green product render from official product page.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 2daba0a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/fauna-sprout/`.
- **Original:** `original.avif`, 2295 × 2150 px, RGBA, 54,814 bytes, sha256 `8ecd9eedb0ad33ce0c871459ed61a2ecad2ade8e4743645eba494a68afcf6466` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small background components removed.); crop ROI [0, 0, 2295, 2150], alpha bounding box [649, 67, 1466, 2028], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `dec0516d9fbb058e6bd5267399e605017761487f461da5ebc9b2df04a590ec38`) and the mask (sha256 `68654b4f9bb5f9e62aff26650ae7e614dbb11670b05ac28c7aca43e49d1360f0`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 103, Lab "Fauna", Robot "Sprout".
- Sprout as shown on Fauna Robotics' official product page (product render "Shot 1"), the Creator Edition the page presents. The record says "Sprout"; the edition is named because the official page presents it.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 6, PR not yet merged)

- **PNG:** `assets/robots/fauna-sprout/fauna-sprout-full-body.png`, 857 × 2001 px, sha256 `dec0516d9fbb058e6bd5267399e605017761487f461da5ebc9b2df04a590ec38` (= Codex's prepared.png).
- **WebP:** `assets/robots/fauna-sprout/fauna-sprout-full-body.webp`, sha256 `6492f68b7bbd6b25bb33048be73a04f93272332f949020e384f6c04809dfa032`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
