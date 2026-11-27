# Bolt (MirrorMe): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** MirrorMe's. No open licence is presumed. The site credits it as "Image: MirrorMe".
- **Page:** https://www.mirrormetech.com/cn/product_5.html
- **File:** https://www.mirrormetech.com/static/img/people-bolt.png
- **Context (Codex):** Official product5 Bolt page exact people-bolt.png, complete biped wearing03jersey. This is Bolt, not other quadrupeds on same page. Native source alpha has floor shadows; ISNET used.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/mirrorme-bolt/`.
- **Original:** `original.png`, 1270 × 808 px, RGBA, 300,466 bytes, sha256 `a2a46b3e41a0540e81fa90ea83a2c7d22202c2137447a3da338c7e4e14995093` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; limited by the original alpha; levels 85..230; replaces Codex's ISNET cutout (dark haze in the arm gap)); crop ROI [0, 0, 1270, 808], alpha bounding box [540, 14, 798, 781], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `87df5aa333b36cffd7794e8bb12d08df1577155d03cc7fa6c805fbdc01020c25`, mask sha256 `c5923ca89686e3f91ca2cd1c003d51f911c12cc33f4b8d7fa3e00d6bff791057`.

## Catalogue identity

- **Record:** catalogue id 193, Lab "MirrorMe", Robot "Bolt".
- Official Bolt product page image people-bolt.png: the complete biped wearing the 03 kit; not the quadrupeds on the same page. Alpha by Claude: the lower of a BiRefNet mask and the original's own transparency, which removes a dark haze in the arm gap. The record is Bolt.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 10, PR not yet merged)

- **PNG:** `assets/robots/mirrorme-bolt/mirrorme-bolt-full-body.png`, 298 × 807 px, sha256 `87df5aa333b36cffd7794e8bb12d08df1577155d03cc7fa6c805fbdc01020c25` (= the prepared.png).
- **WebP:** `assets/robots/mirrorme-bolt/mirrorme-bolt-full-body.webp`, sha256 `55ec9975ac77c219b360695c7a5e0b2729b655a32bde57ea85dfb2cc3db5506b`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
