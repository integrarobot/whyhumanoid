# DR02 (Deep): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** DEEP Robotics's. No open licence is presumed. The site credits it as "Image: DEEP Robotics".
- **Page:** https://www.deeprobotics.cn/en/products/detail/5.html
- **File:** https://www.deeprobotics.cn/en/bocupload/2026/09/09/178894850308982e1dd.webp
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/dr02/`.
- **Original:** `original.webp`, 750 × 1334 px, RGB, 158,020 bytes, sha256 `bdafe5987899efe5d75b5ba2a19c4591fa7d8f6fe643ce5b61db72d952585998` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (alpha levels 85 to 230; components >=80 pixels; Moxi below row1810 excluded); crop ROI [0, 0, 750, 1334], alpha bounding box [295, 341, 513, 993], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `1865b268a06c428020ad2be42c2a956a46693824b3c719809f26f41b70ddabcd`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 159, Lab "Deep", Robot "DR02".
- Photograph on the official DR02 product page; "DR02" is marked on the thigh. The record covers DR02 and DR02 Pro; the alt text claims no Pro variant. Not DR01 (20).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 4, PR 208, merge e152f67, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/deep-robotics-dr02/deep-robotics-dr02-full-body.png`, 258 × 692 px, sha256 `1865b268a06c428020ad2be42c2a956a46693824b3c719809f26f41b70ddabcd` (= Codex's prepared.png).
- **WebP:** `assets/robots/deep-robotics-dr02/deep-robotics-dr02-full-body.webp`, sha256 `3add808dd0a0449570b2213ffe826aefe7b08619717f7f3e33f6beeb7689fd2b`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
