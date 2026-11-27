# MATRIX-1 (Matrix Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Matrix Robotics's. No open licence is presumed. The site credits it as "Image: Matrix Robotics, MATRIX-1 manufacturer product image".
- **Page:** https://matrixrobotics.ai/matrix-1
- **File:** https://matrixrobotics.ai/hero_video.jpg
- **Context (Codex):** Exact /matrix-1 page title MATRIX-1 | Humanoids. Hero video poster /hero_video.jpg appears immediately before h1 MATRIX-1 Next-generation AI humanoid robot for real-world applications, accompanying https://matrixrobotics.ai/hero.mp4. This is NOT homepage MATRIX-3; explicit model1 page and hardware white slender biped rather than MATRIX3. Existing maker image/technical render native3840x2160 showing whole head, both hands and both feet with margins in a plain studio. Root inspected full source contact sheet. Caption MATRIX-1 manufacturer product image (or render after visual review), no capability claims/spec changes. Alpha-only segmentation, exclude floor/reflection/walls, retain originalRGB/native20px padding.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27) and 62f03ab (candidates-28)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/matrix-1-product-native/`.
- **Original:** `original.jpg`, 3840 × 2160 px, RGB, 111,714 bytes, sha256 `c4d582c016cd6e58e39108d8071bec913dc30979b35f57056b460cde6876d733` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230; alpha-only exclusion [0, 1821, 860, 1960]; the soles meet their own reflection in the glossy floor; the brightness profile under both shoes is mirror-symmetric about y = 1980 of the original, so every row from 1981 down is set to alpha 0 (alpha only)); crop ROI [1500, 160, 2360, 2120], alpha bounding box [130, 86, 725, 1821], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `19b07d2a01608cc70a44d1f4c27bbd9f9a731355fc36c77d23dd971354ef116b`, mask sha256 `9a3b650a36d02345dc412ec5dc2abad576998a2e2000210b7cf508d090296164`.

## Catalogue identity

- **Record:** catalogue id 191, Lab "Matrix Robotics", Robot "MATRIX-1".
- The poster image of the hero video on Matrix Robotics' MATRIX-1 page (native 3840 × 2160): the whole robot with head, both hands and both feet, in a plain studio. The walls, the glossy floor and the reflection under the soles are excluded by the alpha mask. It is MATRIX-1, not the MATRIX-3 shown on the maker's homepage.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 15, PR not yet merged)

- **PNG:** `assets/robots/matrix-robotics-matrix-1/matrix-robotics-matrix-1-full-body.png`, 635 × 1775 px, sha256 `19b07d2a01608cc70a44d1f4c27bbd9f9a731355fc36c77d23dd971354ef116b` (= the prepared.png).
- **WebP:** `assets/robots/matrix-robotics-matrix-1/matrix-robotics-matrix-1-full-body.webp`, sha256 `3a77e772be50d50cb36e2855deda49a4b75ebf93d3d5918c85dcb924fd1a825d`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
