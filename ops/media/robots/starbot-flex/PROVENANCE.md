# StarBot Flex (StarBot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** StarBot's. No open licence is presumed. The site credits it as "Image: StarBot, Flex manufacturer product illustration".
- **Page:** https://www.starbotusa.com/
- **File:** https://www.starbotusa.com/starbot_three_robot_platforms_v2.png
- **Context (Codex):** Exact homepage image alt: StarBot Spark, StarBot Astra, and StarBot Flex. Source original decoded from Next/image URL, NOT optimized/upscaled3840 response. Native1536x1024 manufacturer PRODUCT ILLUSTRATION/RENDER, not a hardware photograph or performance evidence. Homepage textual lineup/release sections map Spark3ft smallbiped, Astra5ft biped, Flex5ft9 foldable wheeled configuration. Flex is RIGHT wheeled foldable platform, not middle biped. ApproxROI[1010,0,1536,980], independently widen if needed. Whole head, both hands, entire folding column and mobilebase/wheels visible. Keep exact native visibleRGB. Remove other two figures, floor/reflection/shadow with alpha-only mask; caption explicitly StarBot, [model] manufacturer product illustration. Do not claim independent evidence or change specs. Root inspected full original.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27) and 62f03ab (candidates-28)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/starbot-flex/`.
- **Original:** `original.png`, 1536 × 1024 px, RGB, 1,429,922 bytes, sha256 `dc3ee48adce174ad587fe1510f3aa548e2254a4c432dfa068ff099e4ca43d18e` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-casters-mask.png; levels 85..230; the BiRefNet mask left the two black casters under the base partly transparent or out; inside two small rectangles around them (x 1182..1237, y 943..959 and x 1372..1425, y 932..944 of the original) the mask takes the larger of the model value and a luminance value (opaque below 20, none above 50), so the casters are whole and their mirror reflection and the grey contact shadow stay out); crop ROI [1040, 0, 1536, 1000], alpha bounding box [28, 19, 433, 960], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `a0d2264215c0f75c45de7623868d0e3d0aacd54f084b58355f7a7a2f11a2f3cb`, mask sha256 `4087a5575a8c81448d5930a9446c61a4a2c3da131f02eae49b5524f808665a47`.

## Catalogue identity

- **Record:** catalogue id 200, Lab "StarBot", Robot "StarBot Flex".
- The right-hand figure of the three-robot illustration on StarBot's homepage (native 1536 × 1024): Flex, the wheeled configuration, whole with head, both hands, the folding leg and the wheeled base with its two black casters. It is a product illustration, not a photograph of hardware. The other two figures, the floor reflection and the contact shadow are excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 15, PR not yet merged)

- **PNG:** `assets/robots/starbot-flex/starbot-flex-full-body.png`, 445 × 981 px, sha256 `a0d2264215c0f75c45de7623868d0e3d0aacd54f084b58355f7a7a2f11a2f3cb` (= the prepared.png).
- **WebP:** `assets/robots/starbot-flex/starbot-flex-full-body.webp`, sha256 `bfed625cba59aadcf7e2070b56613cdef657448db8c2ab1daf453999b2d9a4f9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
