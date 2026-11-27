# iX (Simplexity Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Simplexity Robotics's. No open licence is presumed. The site credits it as "Image: Simplexity Robotics, iX manufacturer render, raised-hand configuration".
- **Page:** https://www.simplexityrobotics.com/products/ix
- **File:** https://images.simplexityrobotics.com/official/img/products/ix/ix-fullbody-stand-dark.png
- **Context (Codex):** Exact iX maker product JS Ix-Cj1_xAxG.js references @/assets/img/products/ix/ix-fullbody-stand-dark.png. Official index-Cas0Tc0v.js Ye() resolves assets prefix to https://images.simplexityrobotics.com/official/img. Downloaded original native4096x2304 palette PNG WITH TRUE alpha (BG RGBgreen71,112,76 has alpha0, not actual green background). Alpha bbox[1628,314,2418,2051]. Whole robot head, both dexterous hands (one raised over face in native pose), entire four-wheel chassis and wheels with margins. Existing maker technical render. Preserve ownalpha/RGB, crop/pad only as valid. Caption iX manufacturer render, raised-hand configuration. Different from old cropped torso hero; do not use nonexistent website/assets URL.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/simplexity-ix-complete/`.
- **Original:** `original.png`, 4096 × 2304 px, P, 357,486 bytes, sha256 `fa718374dc103f2f9e71dd1b653c9d19bf6c6ccd772d85f4f57d7adc25445166` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; largest region kept); crop ROI [1580, 280, 2470, 2100], alpha bounding box [48, 34, 838, 1771], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `06caea891c76561175c9b0efbbc5df86a6737d6fde8a4192b539935099cc4925`, mask sha256 `a3e7d9621e38cc6e2b82c7e56c618a414d0b5fc1c7c02066e41293f508976f2a`.

## Catalogue identity

- **Record:** catalogue id 216, Lab "Simplexity Robotics", Robot "iX".
- The full-body iX render served by Simplexity Robotics' own image host (native 4096 × 2304, with its own transparency): the whole robot with head, both dexterous hands, one raised in front of the face as posed in the original, and the entire four-wheel chassis. Cropped and padded only; not the earlier cropped torso hero.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 14, PR 246, merge 6fecfb5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/simplexity-ix/simplexity-ix-full-body.png`, 830 × 1777 px, sha256 `06caea891c76561175c9b0efbbc5df86a6737d6fde8a4192b539935099cc4925` (= the prepared.png).
- **WebP:** `assets/robots/simplexity-ix/simplexity-ix-full-body.webp`, sha256 `cfab0c7b09a14f4b95ec6f7e73b31e300eb1e35c4e989a8ee24570871f4f806f`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
