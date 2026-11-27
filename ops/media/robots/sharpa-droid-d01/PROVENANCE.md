# Droid D01 / Wave (hands) (Sharpa): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Sharpa's. No open licence is presumed. The site credits it as "Image: Sharpa, D01".
- **Page:** https://www.sharpa.com/
- **File:** https://www.sharpa.com/cdn/shop/files/D01_3b6bb232-4d68-43d6-b003-11aedfc3f716.png?v=1791431568&width=2000
- **Context (Codex):** The official Sharpa homepage explicitly labels this exact asset D01, next to separate Wave hand products. Shows the whole D01 platform; not the Wave hands. Grey rounded-rectangle background was opaque despite native alpha; ISNET used to exclude it.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/sharpa-droid-d01/`.
- **Original:** `original.png`, 2000 × 2222 px, P, 555,154 bytes, sha256 `22dee1c14cec5b79ce569179feb48acc4ac4e34f3dce23eaa28237ac68ee4fbf` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad; Alpha-only removal of visually verified background colour (+/-1 RGB) in specific interior gaps, no global colour deletion. Regions: [([862, 648, 942, 905], [238, 238, 238])]; Verified gap edges receive1px expansion with0.45px alpha antialias; body colours untouched.); crop ROI [0, 0, 2000, 2222], alpha bounding box [670, 170, 1490, 2171], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `e7f900b6f34d2e4661d91af4ac27ecc7fbe79679cb0e73b7b003bc9f6979f46f`, mask sha256 `3650b451148b0c48d4a3360d7c7d8c27a053e354e9e95dbefa8a3161eb22dc60`.

## Catalogue identity

- **Record:** catalogue id 81, Lab "Sharpa", Robot "Droid D01 / Wave (hands)".
- Sharpa's homepage labels this asset D01, next to the separate Wave hand products. The record covers Droid D01 and the Wave hand family; the image shows the D01 humanoid, not the Wave hands, and the caption names D01.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 9, PR 230, merge 98b6aa5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/sharpa-droid-d01/sharpa-droid-d01-full-body.png`, 860 × 2041 px, sha256 `e7f900b6f34d2e4661d91af4ac27ecc7fbe79679cb0e73b7b003bc9f6979f46f` (= the prepared.png).
- **WebP:** `assets/robots/sharpa-droid-d01/sharpa-droid-d01-full-body.webp`, sha256 `ebbaebf255af9b06952833be469ce80c573abe1e53c2a6bc9f34997d7f44bf7b`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
