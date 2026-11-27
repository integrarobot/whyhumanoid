# Gento Luna (Gento Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Gento Robotics's. No open licence is presumed. The site credits it as "Image: Gento Robotics".
- **Page:** https://www.gentorobotics.ai/products/gento-luna/
- **File:** https://www.gentorobotics.ai/wp-content/uploads/2026/11/Rectangle-192-2.png
- **Context (Codex):** Gento Luna full specification image from exact product page, including foldable body, both arms and complete wheeled base. No Skye/Marvin substitution.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/gento-luna/`.
- **Original:** `original.png`, 1160 × 1400 px, RGBA, 363,429 bytes, sha256 `235c2af40d2e7acd01517f1cdd4637b77053d7514b1fe4e173a057b088c6a046` (equal to Codex's manifest).
- **Codex's preparation:** original with its own transparency; non-generative alpha mask (Alpha levels85..230; small isolated background components excluded; RGB unchanged.); crop ROI [0, 0, 1160, 1400], alpha bounding box [319, 93, 820, 1320], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `d00ad907468f062c74094298a4ff2cc3196b41f5c919b824189e9634c0d15729`) and the mask (sha256 `d0583040cdbd8d4c07a4d8be82a3d3aabde62a2e25e353680514ec9e57cfadb7`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 178, Lab "Gento Robotics", Robot "Gento Luna".
- Gento Luna from the specification image on its own official product page: the foldable body, both arms and the complete wheeled base. No other Gento robot.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 7, PR 225, merge 8b33837, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/gento-robotics-gento-luna/gento-robotics-gento-luna-full-body.png`, 541 × 1267 px, sha256 `d00ad907468f062c74094298a4ff2cc3196b41f5c919b824189e9634c0d15729` (= Codex's prepared.png).
- **WebP:** `assets/robots/gento-robotics-gento-luna/gento-robotics-gento-luna-full-body.webp`, sha256 `c9300b7be9e75d85a8fc7acccb6542cfcc31e76c61201353c45d66edfc10a907`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
