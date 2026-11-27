# DR01 (Deep): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 5, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** DEEP Robotics's. No open licence is presumed. The site credits it as "Image: DEEP Robotics".
- **Page:** https://www.youtube.com/watch?v=lCFyfh3mLOQ
- **File:** https://i.ytimg.com/vi/lCFyfh3mLOQ/maxresdefault.jpg
- **Context:** DEEPRobotics official DR01 Humanoid Robot Outdoor Test, published2024-10-28; complete original thumbnail body isolated from text; do not use DR02.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit cc1923c) and kept in `ops/media/intake-cd-2026-11-27/batch-05/dr01/`.
- **Original:** `original.jpg`, 1280 × 720 px, RGB, 351,746 bytes, sha256 `de978e6adc7b1a450c2cd3bd55ae4cab9fa90ac30c23649176255699a2c64eb9` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha-only manual polygons restore both feet missed by automatic mask); crop ROI [280, 0, 700, 710], alpha bounding box [36, 22, 400, 678], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `d0ff825fe81632907d64ae2c34db68c8c3965ec533a34802b5b5333cac360d00`) and the mask, reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 20, Lab "Deep", Robot "DR01".
- The robot in the thumbnail of DEEP Robotics' official video "DR01 Humanoid Robot Outdoor Test" (YouTube, published 28 Oct 2024), isolated from the thumbnail text. Not DR02 (159). Codex restored both feet with alpha-only polygons after the automatic mask missed them; RGB unchanged. Modest resolution: from a 1280 × 720 thumbnail, published at its native size (quality debt).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 5, PR not yet merged)

- **PNG:** `assets/robots/deep-robotics-dr01/deep-robotics-dr01-full-body.png`, 404 × 696 px, sha256 `d0ff825fe81632907d64ae2c34db68c8c3965ec533a34802b5b5333cac360d00` (= Codex's prepared.png).
- **WebP:** `assets/robots/deep-robotics-dr01/deep-robotics-dr01-full-body.webp`, sha256 `b721895536db365bf61ed8000df8858091baf17c318d13dd28a8f694f2bbb840`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
