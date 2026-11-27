# Kuavo (Leju): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** LejuRobotics's. No open licence is presumed. The site credits it as "Image: Leju, Kuavo 4Pro technical render with articulated hands".
- **Page:** https://github.com/LejuRobotics/kuavo-ros-opensource/blob/main/docs/1%E4%BA%A7%E5%93%81%E4%BB%8B%E7%BB%8D/images/kuavo_4pro.png
- **File:** https://raw.githubusercontent.com/LejuRobotics/kuavo-ros-opensource/main/docs/1%E4%BA%A7%E5%93%81%E4%BB%8B%E7%BB%8D/images/kuavo_4pro.png
- **Context (Codex):** Existing manufacturer technical render, native RGBA 5000x2813 with original alpha bbox [2065,142,3342,2675]. Whole head, both articulated hands and both feet. Open side/head cavities are the depicted CAD configuration, preserve them, do not invent panels. This replaces rejected 520x1170 standard image with flat gray placeholder hands. Use original alpha/native pixels and trim/pad only if valid. Credit Kuavo 4Pro technical render with articulated hands/open-frame configuration, not hardware photo; no master/spec changes.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/kuavo-4pro-articulated-hands/`.
- **Original:** `original.png`, 5000 × 2813 px, RGBA, 3,810,091 bytes, sha256 `3cf9f2e12b09244f2cf798a59c8ec6dcca0842aeb8f4f1bf2aeb2d4cf7552ed1` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha); crop ROI [1950, 0, 3450, 2813], alpha bounding box [115, 142, 1392, 2675], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `d5df66de9ae823ac101dd247bcfe1b826ce1b5e14e10faf90b40baeb18caea29`, mask sha256 `c05c9c6542a8dab7029c58b8e6e961946d7f1c928f4b331af8ba7d8ae3d41a6e`.

## Catalogue identity

- **Record:** catalogue id 49, Lab "Leju", Robot "Kuavo".
- An existing Leju technical render of the Kuavo 4Pro with its own transparency (native 5000 × 2813): the whole robot with head, both articulated hands and both feet. The open side and head cavities are part of the depicted configuration and are kept; nothing is added. It is a technical render, not a hardware photograph. The record is the Kuavo family; no specification of another generation is implied.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 13, PR 242, merge c314f66, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/leju-kuavo-4pro/leju-kuavo-4pro-full-body.png`, 1317 × 2573 px, sha256 `d5df66de9ae823ac101dd247bcfe1b826ce1b5e14e10faf90b40baeb18caea29` (= the prepared.png).
- **WebP:** `assets/robots/leju-kuavo-4pro/leju-kuavo-4pro-full-body.webp`, sha256 `0d202a0ba982ceaede2088ee3b7cb942a72a12884f017d91c0de31d4d67332c6`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
