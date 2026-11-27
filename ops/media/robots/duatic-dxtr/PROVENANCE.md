# DXTR (Duatic): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Duatic's. No open licence is presumed. The site credits it as "Image: Duatic".
- **Page:** https://www.duatic.com/dxtr
- **File:** https://www.duatic.com/web/image/7946-ba79d6a1/duatic_alpha_2.webp
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/dxtr/`.
- **Original:** `original.webp`, 1440 × 1440 px, RGBA, 139,638 bytes, sha256 `3cddafb962755b36f948c0cee229402c6d7c70f436bd0e6ddd8f0499b61022ef` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; crop ROI [0, 0, 1440, 1440], alpha bounding box [340, 38, 1160, 1366], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `a538e53406e559089aca9b2fadfa78424b411dd0f12d5640c01fbc0d2f5b3aad`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 175, Lab "Duatic", Robot "DXTR".
- The full-robot image in the current og:image metadata of the official /dxtr page; the historical file name contains "alpha_2", which is not a model claim. Shown whole: DuaTorso upper body on the DuaRover base. The robot is carrying a box, part of the original image.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 4, PR 208, merge e152f67, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/duatic-dxtr/duatic-dxtr-full-body.png`, 860 × 1368 px, sha256 `a538e53406e559089aca9b2fadfa78424b411dd0f12d5640c01fbc0d2f5b3aad` (= Codex's prepared.png).
- **WebP:** `assets/robots/duatic-dxtr/duatic-dxtr-full-body.webp`, sha256 `3275ef20c5a4a7a6f4b452e31ca48735bd936ba1051ddf5c1f4bb0743bd40cf6`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.

## Held object

The robot carries a box in the official image. Accepted by Codex on 27 Nov 2026 as an exception to the preference for images without accessories: the object is present in the source, no limb is cropped, and nothing is erased or reconstructed.
