# CYBORG-W01 (Cyborg Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Cyborg Robotics's. No open licence is presumed. The site credits it as "Image: Cyborg Robotics".
- **Page:** https://www.cyb-org.cn/
- **File:** https://www.cyb-org.cn/res/202606/02/717d1878472dbb31.jpg
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/cyborg-w01/`.
- **Original:** `original.jpg`, 2400 × 1568 px, RGB, 549,928 bytes, sha256 `b199559b28dfb63adab56315db10bc32131425faca0c7f9b00a024f2d8b0eddc` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (alpha levels 85 to 230; components >=80 pixels; Moxi below row1810 excluded); crop ROI [0, 0, 2400, 1568], alpha bounding box [881, 110, 1499, 1532], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `80141b61e90df5c6f3359549d49f927ec1da53e7dc7b883bf82ec33ed6f6b33f`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 170, Lab "Cyborg Robotics", Robot "CYBORG-W01".
- Image from the official Cyborg Robotics site (cyb-org.cn), including its full wheeled base. Not CYBORG-R01 (169).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 4, PR 208, merge e152f67, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/cyborg-w01/cyborg-w01-full-body.png`, 658 × 1462 px, sha256 `80141b61e90df5c6f3359549d49f927ec1da53e7dc7b883bf82ec33ed6f6b33f` (= Codex's prepared.png).
- **WebP:** `assets/robots/cyborg-w01/cyborg-w01-full-body.webp`, sha256 `5242eb1f97f6936cd75a441a3b7539eae0c322868da9e739d6e990b9dfaaa9c7`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
