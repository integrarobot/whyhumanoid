# StarBot Astra (StarBot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** StarBot's. No open licence is presumed. The site credits it as "Image: StarBot, Astra manufacturer product illustration".
- **Page:** https://www.starbotusa.com/
- **File:** https://www.starbotusa.com/starbot_three_robot_platforms_v2.png
- **Context (Codex):** Exact homepage image alt: StarBot Spark, StarBot Astra, and StarBot Flex. Source original decoded from Next/image URL, NOT optimized/upscaled3840 response. Native1536x1024 manufacturer PRODUCT ILLUSTRATION/RENDER, not a hardware photograph or performance evidence. Homepage textual lineup/release sections map Spark3ft smallbiped, Astra5ft biped, Flex5ft9 foldable wheeled configuration. Astra is CENTER biped. Spark left smaller is not the record. ApproxROI[480,0,1000,970], independently widen if needed. Both hands and feet whole, no external occlusion. Keep exact native visibleRGB. Remove other two figures, floor/reflection/shadow with alpha-only mask; caption explicitly StarBot, [model] manufacturer product illustration. Do not claim independent evidence or change specs. Root inspected full original.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27) and 62f03ab (candidates-28)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/starbot-astra/`.
- **Original:** `original.png`, 1536 × 1024 px, RGB, 1,429,922 bytes, sha256 `dc3ee48adce174ad587fe1510f3aa548e2254a4c432dfa068ff099e4ca43d18e` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [470, 0, 1010, 1000], alpha bounding box [79, 38, 420, 942], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `392d9fbc41e58f2bb003cd88ef50ffdc95ab4bf3fb11a102369670953704ae1a`, mask sha256 `a0bae99dc10500e1bb9a2b7b9e971a51162006f18b6693f5e7982cd89b55179c`.

## Catalogue identity

- **Record:** catalogue id 199, Lab "StarBot", Robot "StarBot Astra".
- The centre figure of the three-robot illustration on StarBot's homepage (native 1536 × 1024): Astra, the full-size biped, whole with head, both hands and both feet. It is a product illustration, not a photograph of hardware. The smaller Spark on the left, the wheeled Flex on the right and the floor reflection are excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 15, PR 249, merge 672539d, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/starbot-astra/starbot-astra-full-body.png`, 381 × 944 px, sha256 `392d9fbc41e58f2bb003cd88ef50ffdc95ab4bf3fb11a102369670953704ae1a` (= the prepared.png).
- **WebP:** `assets/robots/starbot-astra/starbot-astra-full-body.webp`, sha256 `290cf2d50e4c253d5352572ecaf23c76202efc07bcabf536b6d265a05c19a0b9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
