# Centaur-G1 (Elite Robots): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Elite Robots's. No open licence is presumed. The site credits it as "Image: Elite Robots".
- **Page:** https://www.elibot.com/product/wheeled
- **File:** https://www.elibot.com/Public/Uploads/uploadfile/images/20260521/b1img11.jpg
- **Context (Codex):** Centaur-G1 complete wheeled dual-arm platform, manufacturer kitchen illustration, holding a cup and utensil. Native444x539 cutout; no upscale. Not Unitree/AgiBot G1. Render does not prove a deployment.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 2daba0a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/elite-centaur-g1/`.
- **Original:** `original.jpg`, 880 × 560 px, RGB, 316,601 bytes, sha256 `d5434bff7a6bf2e74ce2ed6d0ba56e7b054ac397066eda4851298345d1281f49` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (ISNET mask, alpha levels85..230.); crop ROI [365, 0, 810, 540], alpha bounding box [7, 23, 411, 522], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `3b97ba1ae475c23193b53e30218dcf34951d8e549d2da25e5904533f23ed17a1`) and the mask (sha256 `b541d320053d51216d7e63755322ff8238d9becd19c62aa8b8be20e9d50303ea`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 176, Lab "Elite Robots", Robot "Centaur-G1".
- Centaur-G1 from Elite Robots' official wheeled-robot page (b1img11.jpg, uploaded 21 May 2026): the complete wheeled two-arm platform in the maker's kitchen illustration, holding a cup and a utensil, which stay as in the source. Not a Unitree G1 or AgiBot G1. A render does not prove a deployment.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

- **Quality:** Modest resolution: 444 × 539 native cutout; no upscaling.

## Published files (image batch 6, PR 216, merge b24a276, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/elite-robots-centaur-g1/elite-robots-centaur-g1-full-body.png`, 444 × 539 px, sha256 `3b97ba1ae475c23193b53e30218dcf34951d8e549d2da25e5904533f23ed17a1` (= Codex's prepared.png).
- **WebP:** `assets/robots/elite-robots-centaur-g1/elite-robots-centaur-g1-full-body.webp`, sha256 `7371fef100dc57e25a6195dff37415f0485189624ff410843fe7c18c9c8315f3`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
