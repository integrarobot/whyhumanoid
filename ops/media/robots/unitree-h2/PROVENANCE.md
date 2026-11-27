# H2 (Unitree): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Unitree's. No open licence is presumed. The site credits it as "Image: Unitree".
- **Page:** https://www.unitree.com/H2/
- **File:** https://www.unitree.com/images/32686742408341c5af3b5dc2f4c85b0e_3840x2160.jpg
- **Context (Codex):** Official exact H2 page source139-10 full factory demonstration still, not generic shared header R1/G1 image. Both feet and head present.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/unitree-h2/`.
- **Original:** `original.jpg`, 3840 × 2160 px, RGB, 305,432 bytes, sha256 `26a69275e647b734d2ac42c0550332f4d8407d965ee55457f3f3626c903dd4e2` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230; replaces Codex's ISNET cutout (raised arm missing and a spectator kept between the legs)); crop ROI [950, 0, 2450, 2160], alpha bounding box [339, 256, 1260, 2103], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `d8a079857f3a5f8f968f5af162c256ea130ce6ce9f2c8ccfc4d6af534da3ea0e`, mask sha256 `4b08150db4b9a56925278e991c3b6d2abfed9a20643ee1cde299257b71e6ea38`.

## Catalogue identity

- **Record:** catalogue id 139, Lab "Unitree", Robot "H2".
- Official Unitree H2 page image (a still of the robot outdoors). Alpha by Claude from a BiRefNet mask of the original (kept beside it), replacing a cutout that lost the raised arm and kept a spectator between the legs. The record is H2 and H2 EDU; no edition is attributed.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 10, PR not yet merged)

- **PNG:** `assets/robots/unitree-h2/unitree-h2-full-body.png`, 961 × 1887 px, sha256 `d8a079857f3a5f8f968f5af162c256ea130ce6ce9f2c8ccfc4d6af534da3ea0e` (= the prepared.png).
- **WebP:** `assets/robots/unitree-h2/unitree-h2-full-body.webp`, sha256 `71ce1b8a2f211b11b99336a0d7df5358d4825355aceeeec805771c4cac0d4b95`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
