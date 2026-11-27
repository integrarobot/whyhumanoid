# Forerunner K1 (Kepler): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** KeplerRobotics's. No open licence is presumed. The site credits it as "Image: Kepler, Forerunner K1 manufacturer render".
- **Page:** https://www.gotokepler.com/productDetailK1
- **File:** https://img.gotokepler.com/image/gotokepler/productDetail_k1/P3-en.png
- **Context (Codex):** Manufacturer exactK1page chunk-465a62fa.6567f29a.js mapsP3-en.png productdiagram. Native3313x2076RGBAfullstandingwhiteK1 withbothhandsandfeet. Annotationlinesstopoutsidebody. Helmettop touches imageborder ONLYantialias(maxalpha136onrow0,noopaque topcrop); fullroundedcontourvisiblebutindependentlyreviewwhetherwholeheadcanbecredited. Preservetoprim, do notmakeup margin/body; ifactuallycroppedrejectandseekother. Existingmanufacturer render notnew3D.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/kepler-k1/`.
- **Original:** `original.png`, 3313 × 2076 px, RGBA, 1,266,178 bytes, sha256 `46ec07ff69e55e8c53bd7226a65701fe799bf2b2004f0d0f3601f13de0fbfd8a` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; largest region kept); crop ROI [1280, 0, 2050, 2076], alpha bounding box [22, 0, 730, 2076], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `8d44aeb47bbb8a945668c5c22dc89d2895afbdb287898cfec759d18b76604a8d`, mask sha256 `8e30dabb0171c539e8fad1fb0e770561320a73c296a970189f115ab492c60e9e`.

## Catalogue identity

- **Record:** catalogue id 47, Lab "Kepler", Robot "Forerunner K1".
- The product diagram of Kepler's K1 page (an existing manufacturer render with its own transparency, native 3313 × 2076): the whole white and silver K1 with both hands and both feet; the annotation labels around it are left out with their lines. The helmet top and the soles reach the edges of the publisher's file only with their faint antialiased outline (no opaque pixel in either edge row: alpha at most 136 at the top and 176 at the bottom), so the whole rounded contour is shown; nothing is extended or redrawn.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 12, PR 240, merge fa0b12c, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/kepler-forerunner-k1/kepler-forerunner-k1-full-body.png`, 748 × 2116 px, sha256 `8d44aeb47bbb8a945668c5c22dc89d2895afbdb287898cfec759d18b76604a8d` (= the prepared.png).
- **WebP:** `assets/robots/kepler-forerunner-k1/kepler-forerunner-k1-full-body.webp`, sha256 `ba1cb5d458b844f83616f7d3487980e6f44cede653e48ba6458d07aa26eb96b3`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
