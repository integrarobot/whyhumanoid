# MATRIX-3 (Matrix Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** MatrixRobotics's. No open licence is presumed. The site credits it as "Image: Matrix Robotics, MATRIX-3 video poster".
- **Page:** https://matrixrobotics.ai/matrix-3
- **File:** https://matrixrobotics.ai/matrix-3/20260108_MATRIX03_EN_4k.jpg
- **Context (Codex):** Exact MATRIX3 page official introduction-video poster20260108_MATRIX03_EN_4k.jpg1280x720. Whole single robot to left of explicit MATRIX-3 title, head,hands,both complete feet and floor margin. Existing manufacturer render/video poster. Same asset appears on generic homepage but must NOT be assigned to MATRIX1 record191.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/matrix-3/`.
- **Original:** `original.jpg`, 1280 × 720 px, RGB, 20,375 bytes, sha256 `d3ddcc64a85023354ecc31b22c9984ac8e107674ef27335777660b84f9ba60d2` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [300, 0, 700, 720], alpha bounding box [94, 45, 300, 703], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `3b256534c766d6b9c0237c268b4e90ab1db209b63ce58b948135b3d76ebc6fa4`, mask sha256 `67bb3f3fabaa8add4ef4450e05e5ad06e4996401823e523fc81638d41fcb20b2`.

## Catalogue identity

- **Record:** catalogue id 190, Lab "Matrix Robotics", Robot "MATRIX-3".
- Poster of the official MATRIX-3 introduction video on the MATRIX-3 page, beside the MATRIX-3 title: the whole robot with head, hands and both feet; the title is excluded. A manufacturer render or video poster. Never used for the MATRIX-1 record (191). The record is MATRIX-3.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 11, PR not yet merged)

- **PNG:** `assets/robots/matrix-3/matrix-3-full-body.png`, 246 × 698 px, sha256 `3b256534c766d6b9c0237c268b4e90ab1db209b63ce58b948135b3d76ebc6fa4` (= the prepared.png).
- **WebP:** `assets/robots/matrix-3/matrix-3-full-body.webp`, sha256 `18ea31cceb50b91ed2c5950b6f85ded0807a2048ae47c19853f8066afb311ac8`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
