# R1 (Unitree): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Unitree's. No open licence is presumed. The site credits it as "Image: Unitree".
- **Page:** https://www.unitree.com/R1/
- **File:** https://www.unitree.com/images/f74777897620408abc9201ffed371895_1400x788.jpg
- **Context (Codex):** Official exact R1 page source141-14 full robot running on grass. Both feet visible, including raised foot. No catalogue change.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/unitree-r1/`.
- **Original:** `original.jpg`, 1400 × 788 px, RGB, 698,533 bytes, sha256 `0ec219000c5f9e46f47692304e6c358fe75081ec437114bf5800521c85cac34d` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230; replaces Codex's ISNET cutout (grass fringe between arm and leg)); crop ROI [350, 0, 1000, 788], alpha bounding box [85, 48, 554, 678], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `21962cc255966c7f8906d4c8b70a7fca0575e600165a97fea67d19fba3de564a`, mask sha256 `a6cb944b9967cf58381e42a4200885da5f9542b1b138db8c76b75ebfceccf891`.

## Catalogue identity

- **Record:** catalogue id 141, Lab "Unitree", Robot "R1".
- Official Unitree R1 page image of the robot running on grass, both feet visible. Alpha by Claude from a BiRefNet mask of the original (kept beside it), without the grass fringe. The record is R1, R1 AIR and R1 EDU; no edition is attributed.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 10, PR 232, merge 4db495d, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/unitree-r1/unitree-r1-full-body.png`, 509 × 670 px, sha256 `21962cc255966c7f8906d4c8b70a7fca0575e600165a97fea67d19fba3de564a` (= the prepared.png).
- **WebP:** `assets/robots/unitree-r1/unitree-r1-full-body.webp`, sha256 `8fdfc14d31aaec3130b605b76b502edc7112c633656e9469643a2b60a4cdc14a`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
