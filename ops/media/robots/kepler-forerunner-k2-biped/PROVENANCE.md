# Forerunner K2 (Kepler): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** KeplerRobotics's. No open licence is presumed. The site credits it as "Image: Kepler, K2 bipedal development version, manufacturer render".
- **Page:** https://www.gotokepler.com/productDetailK2
- **File:** https://img.gotokepler.com/image/gotokepler/productDetail_K2/pc/intro1_en.png
- **Context (Codex):** Manufacturer K2 page JS chunk-3e8ff8ce.2264ca8b.js explicitlymapsintro1_en.png to Bipedal Development Version, notwheeledintro2/basicintro3. Native5760x2814 existingmanufacturer diagram/render, fullheadhandsfeet. Blueannotationdots/lines stopOUTSIDEbody, so exclude bymaskwithoutbodyRGBalteration. CurrentfileportraitROIrootpreviewshowedallannotationmarkersoutside; inspectinteriors. Caption K2 Bipedal Development Version, manufacturer render, no specschange.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/kepler-k2-biped/`.
- **Original:** `original.png`, 5760 × 2814 px, RGBA, 1,983,931 bytes, sha256 `263314b19964a446ceb3fc2d4e7cae7073130e8d9af3b80b5f1c7844630d65b6` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [2300, 200, 3500, 2650], alpha bounding box [73, 53, 1121, 2367], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `7be3d73ece8c9ac09ac3ef7cf4f25b6f6b945ed518191755706137f441bac5cf`, mask sha256 `7de61fbc3f860f1ae4d34c221bf6bfdaafe4eafe4923b6b763dbf86757c5ea9e`.

## Catalogue identity

- **Record:** catalogue id 215, Lab "Kepler", Robot "Forerunner K2".
- The intro image of Kepler's K2 product page, which the page's own code maps to the Bipedal Development Version (an existing manufacturer render, native 5760 × 2814): the whole yellow and black biped with head, both hands and both feet. The annotation dots and lines, which stop outside the body, and the black background are excluded by the alpha mask. Not the wheeled or basic K2 versions.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 12, PR not yet merged)

- **PNG:** `assets/robots/kepler-forerunner-k2-biped/kepler-forerunner-k2-biped-full-body.png`, 1088 × 2354 px, sha256 `7be3d73ece8c9ac09ac3ef7cf4f25b6f6b945ed518191755706137f441bac5cf` (= the prepared.png).
- **WebP:** `assets/robots/kepler-forerunner-k2-biped/kepler-forerunner-k2-biped-full-body.webp`, sha256 `e9253e0c4693f115448c3f3046926c4571bfdfee59a7c082e7c2fb5e9ddaad91`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
