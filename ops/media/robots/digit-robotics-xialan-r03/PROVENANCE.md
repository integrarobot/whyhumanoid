# Xialan R03 (Digit Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 5, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Digit Robotics's. No open licence is presumed. The site credits it as "Image: Digit Robotics".
- **Page:** https://www.digit.com.cn/ProductsDetail/250.html
- **File:** https://www.digit.com.cn/UserFiles/ueditor/6393020077779566971161026.jpg
- **Context:** Central full-body R03 in cream clothing from its official specifications infographic. Annotations remain outside robot; alpha-only left mechanical arm restoration.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit cc1923c) and kept in `ops/media/intake-cd-2026-11-27/batch-05/xialan-r03/`.
- **Original:** `original.jpg`, 750 × 854 px, RGB, 299,279 bytes, sha256 `e12c54ee39ba290097a192f5c29d5c59ffc5140e6808044d3edba094f5e4068a` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha-only manual polygon restores mechanical left arm missed by segmentation; source RGB unchanged.); crop ROI [230, 15, 465, 850], alpha bounding box [12, 10, 227, 831], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `6fd497e65ecbcc8193e03dabbb96c55d5bac48f59ea6e2b17dfa2ba6eaf550a5`) and the mask, reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 171, Lab "Digit Robotics", Robot "Xialan R03".
- The central full-body R03 of the official specifications infographic of Digit Robotics (数字华夏, digit.com.cn); the annotations stay outside the robot. Codex restored the mechanical left arm with an alpha-only polygon; RGB unchanged. Not Agility Robotics' Digit (6); not XiaQi X02 (172).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 5, PR 212, merge c1f79be, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/digit-robotics-xialan-r03/digit-robotics-xialan-r03-full-body.png`, 255 × 861 px, sha256 `6fd497e65ecbcc8193e03dabbb96c55d5bac48f59ea6e2b17dfa2ba6eaf550a5` (= Codex's prepared.png).
- **WebP:** `assets/robots/digit-robotics-xialan-r03/digit-robotics-xialan-r03-full-body.webp`, sha256 `0ca021a3e644fa798eb22822bcc198f05408f63eddfdbca64d14354a60393693`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
