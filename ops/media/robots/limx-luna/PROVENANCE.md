# Luna (LimX): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 17, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** LimX Dynamics's. No open licence is presumed. The site credits it as "Image: LimX Dynamics, Luna manufacturer brochure render (June 2026), walking configuration".
- **Page:** https://www.limxdynamics.com/en/products/luna/download
- **File:** https://www.limxdynamics.com/pdf/LimX_Luna_Brochure_20260629.pdf
- **Context (Codex):** Manufacturer official Luna brochure2026-06-29, logicalpage2 RGB native3509x2482 imageobject7 (wholepage flattened; do not rasterize/rescale). Select ONLY large single full Luna walking render in UPPER RIGHT of page, approximateROI x2350..3000,y200..1200. Root inspected native crop: complete head, both actual palm-shaped hand models, both entire feet including raised rearfoot; no annotations painted ON body and no other robot overlaps this figure. White LIMXLUNA lettering behind/above head remains OUTSIDE robot contour, remove via alpha with all graphics/floor/shadow. Body~880px high, qualifies native without enlargement. Caption LimXDynamics, Luna manufacturer brochure render (June2026), walking configuration. Preserve original fabric/lightmetal RGB and actual smooth palm-shaped hands, do not add dexterousfingers. Lowerleft small front, dancing montage, torso and partiallyoverlapping frontcoverfigures are not selected. This solves earlier lowresolution nativevideo frames; no data/spec changes.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit c21bf62 (candidates-44), 56c65d0 (candidates-45), 5c11af4 (candidates-46) and acda4f4 (candidates-47)); kept in `ops/media/intake-remaining-2026-11-27/batch-17/limx-luna-brochure-whole-walk/`.
- **Original:** `original.png`, 3509 × 2482 px, RGB, 3,721,748 bytes, sha256 `e988ae54e7f090757060282e7f43caee0b5681740f2f78899ecdffc4640af5ac` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240); crop ROI [2330, 180, 3020, 1230], alpha bounding box [154, 83, 431, 962], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `a1fb229923cfcb1d311c213035e4ec503b9d868e7b1460263b4a374b7c90ce2d`, mask sha256 `c7d6ce45ebe2dc86251a272cffa257a830070e28f1307be642d214f3f75c863d`.

## Catalogue identity

- **Record:** catalogue id 156, Lab "LimX", Robot "Luna".
- The large walking figure on page 2 of LimX Dynamics' Luna brochure of 29 June 2026 (embedded page image, native 3509 × 2482): the whole robot with head, both open hands and both feet, the rear one raised. The LIMX Luna lettering behind it, the smaller figures, the page graphics and the shadow are excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 17, PR not yet merged)

- **PNG:** `assets/robots/limx-luna/limx-luna-full-body.png`, 317 × 919 px, sha256 `a1fb229923cfcb1d311c213035e4ec503b9d868e7b1460263b4a374b7c90ce2d` (= the prepared.png).
- **WebP:** `assets/robots/limx-luna/limx-luna-full-body.webp`, sha256 `741f73b6e73bdc99323ea1931efb185138af708dcd4b9cb7e67d3a3b17cde52b`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
