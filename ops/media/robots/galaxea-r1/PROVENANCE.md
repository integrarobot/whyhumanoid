# R1 (Galaxea): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Galaxea Dynamics's. No open licence is presumed. The site credits it as "Image: Galaxea Dynamics".
- **Page:** https://github.com/userguide-galaxea/Product_User_Guide/blob/galaxea/main/docs/en/Guide/R1/R1_Overview.md
- **File:** https://raw.githubusercontent.com/userguide-galaxea/Product_User_Guide/galaxea/main/docs/en/Guide/R1/assets/R1_R1T.png
- **Context (Codex):** Standard R1, full wheeled robot holding its box, isolated from separate R1-Teleop apparatus on left. Official user-guide R1 section separate from R1 Lite and R1 Pro. Preserve box; no hardware configuration inferred from appearance.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/galaxea-r1/`.
- **Original:** `original.png`, 6000 × 2800 px, RGBA, 1,613,798 bytes, sha256 `6aa086ea8a85d7543e14dbef2bca90b3ac4681f2876dfaec77859f6a23cde65b` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small background components excluded; original RGB unchanged. Review correction: interior of right chassis and wheel made fully opaque (255), with exterior edge antialias preserved.); crop ROI [2500, 0, 4100, 2425], alpha bounding box [122, 38, 1507, 2398], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `474cb13df020e944108143a5af169e2da5d4bd78ca6957d9e9587d5914e57bac`) and the mask (sha256 `b5e86ebdf7fe5987d5b51155f2dd580df872da09eae2c26bd935c6917e261ff9`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 34, Lab "Galaxea", Robot "R1".
- The standard R1 in the R1 section of Galaxea's official user guide (R1 Overview, "R1-Teleop"), separate from the R1 Pro and R1 Lite sections; the box it holds stays as in the source, and the separate R1-Teleop device beside it is left out by the crop, not erased. No hardware configuration is inferred from appearance.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 7, PR 225, merge 8b33837, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/galaxea-r1/galaxea-r1-full-body.png`, 1425 × 2400 px, sha256 `474cb13df020e944108143a5af169e2da5d4bd78ca6957d9e9587d5914e57bac` (= Codex's prepared.png).
- **WebP:** `assets/robots/galaxea-r1/galaxea-r1-full-body.webp`, sha256 `2c54320a6e49a170a3dc0b15026ebf4c8aeaf15e0a9aec744c8a310916f00f34`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
