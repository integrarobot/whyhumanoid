# Cinnamon 1 (Donut Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 5, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Donut Robotics's. No open licence is presumed. The site credits it as "Image: Donut Robotics".
- **Page:** https://www.donutrobotics.com/en
- **File:** https://static.wixstatic.com/media/47f0f3_624de109facb4d7b86a5642b8d4ea2bc~mv2.jpg
- **Context:** Manufacturer homepage explicitly captions photo28 as Cinnamon1 Silent Gesture Control; top-photo robot isolated without person. Do not call this Cinnamon2 or assert Donut manufactured the OEM body.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit cc1923c) and kept in `ops/media/intake-cd-2026-11-27/batch-05/cinnamon-1/`.
- **Original:** `original.jpg`, 1579 × 2046 px, RGB, 1,777,919 bytes, sha256 `2a7c9d3ade0e0d4f24013085997ef3ba751a452717b85dc6a69417c5e42f8ab4` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (non-generative alpha mask); crop ROI [860, 100, 1280, 1030], alpha bounding box [21, 35, 384, 917], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `221c03a62b748ec562d571dadc4f602fc59e3700e01d82001933fc34e2c394a7`) and the mask, reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 173, Lab "Donut Robotics", Robot "Cinnamon 1".
- The photograph the Donut Robotics homepage captions "Cinnamon 1 Silent Gesture Control"; the robot is isolated from the person in the photo. Not Cinnamon 2 nor cinnamon mini. Donut runs its own AI on a body from an overseas OEM: the alt text and credit do not claim Donut manufactured the body.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 5, PR 212, merge c1f79be, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/donut-robotics-cinnamon-1/donut-robotics-cinnamon-1-full-body.png`, 403 × 922 px, sha256 `221c03a62b748ec562d571dadc4f602fc59e3700e01d82001933fc34e2c394a7` (= Codex's prepared.png).
- **WebP:** `assets/robots/donut-robotics-cinnamon-1/donut-robotics-cinnamon-1-full-body.webp`, sha256 `2b216e2afbaa68a86b8ff296916451f16b4337e33372ee7b137e0da35a6d44cb`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
