# CYBORG-R01 (Cyborg Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Cyborg Robotics's. No open licence is presumed. The site credits it as "Image: Cyborg Robotics".
- **Page:** https://www.cyb-org.cn/
- **File:** https://www.cyb-org.cn/res/202606/02/cf39546953c0e833.jpg
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/cyborg-r01/`.
- **Original:** `original.jpg`, 2400 × 1568 px, RGB, 468,888 bytes, sha256 `b34a0e7c2d1626551d57a18ab6781e6203dc5509ea2b879e32dec45a2f28f48b` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (alpha levels 85 to 230; components >=80 pixels; Moxi below row1810 excluded); crop ROI [0, 0, 2400, 1568], alpha bounding box [878, 94, 1524, 1525], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `cfaeb7a1ac8f939c30389e4161e202479e6c223d9a8f6c4a869d5cb4b54178b1`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 169, Lab "Cyborg Robotics", Robot "CYBORG-R01".
- Image from the official Cyborg Robotics site (cyb-org.cn). Bipedal; not CYBORG-W01 (170).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 4, PR not yet merged)

- **PNG:** `assets/robots/cyborg-r01/cyborg-r01-full-body.png`, 686 × 1471 px, sha256 `cfaeb7a1ac8f939c30389e4161e202479e6c223d9a8f6c4a869d5cb4b54178b1` (= Codex's prepared.png).
- **WebP:** `assets/robots/cyborg-r01/cyborg-r01-full-body.webp`, sha256 `d4fc54fb24fec88f549aee477057d5ebebea850202295887ffa9b9d938de08ed`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
