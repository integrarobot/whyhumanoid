# Deux (XYZ): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 17, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** XYZ's. No open licence is presumed. The site credits it as "Image: XYZ, DEUX manufacturer product render, mobile dual-arm platform".
- **Page:** https://xyzcorp.imweb.me/DEUX
- **File:** https://cdn.imweb.me/thumbnail/20260622/8549da12deb75.png
- **Context (Codex):** Exact DEUX maker product page, native682x914 existing clean frontal manufacturer product render with TRUE original alpha. Whole mobile dual-arm platform, top crossbar with two sensors, both original three-finger grippers and full pedestal/base intact with margins. No separate human-style head or legs by design: never add these. Root examined whole original native image; no callout annotations, floor or people. Use original alpha, crop/pad20px only, keep native RGB/resolution. Caption XYZ, DEUX manufacturer product render, mobile dual-arm platform. Do not use adjacent cartoon hospitality scenes/illustrations, technicalwireframe boundingbox or humancomparison drawings. This source is direct linked PNG in final product section, not a newly generated URDF render. No model/spec/category change.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit c21bf62 (candidates-44), 56c65d0 (candidates-45), 5c11af4 (candidates-46) and acda4f4 (candidates-47)); kept in `ops/media/intake-remaining-2026-11-27/batch-17/xyz-deux-complete-original-alpha/`.
- **Original:** `original.png`, 682 × 914 px, RGBA, 103,513 bytes, sha256 `1af44aa098a80026ec303f8b281a294b173df0223a4891a60b5935f0a8e13502` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; the PNG linked by the maker carries its own alpha; cropped and padded only); crop ROI [0, 0, 682, 914], alpha bounding box [168, 89, 510, 834], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `f9345a1c06923a73ea7f732e4d583486db89d49400bfc2cd8015581fefd9a0f5`, mask sha256 `78f2093f96a3df77083c4d65df99673cb4f7f1634220129db5abb30079f3d78a`.

## Catalogue identity

- **Record:** catalogue id 122, Lab "XYZ", Robot "Deux".
- The front product render on XYZ's DEUX page (native 682 × 914, with its own transparency): the whole mobile dual-arm platform, with the sensor crossbar on top, both three-finger hands, the column and the complete base. It has no head or legs, and none are added. Cropped and padded only.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 17, PR 253, merge 36ea0eb, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/xyz-deux/xyz-deux-full-body.png`, 382 × 785 px, sha256 `f9345a1c06923a73ea7f732e4d583486db89d49400bfc2cd8015581fefd9a0f5` (= the prepared.png).
- **WebP:** `assets/robots/xyz-deux/xyz-deux-full-body.webp`, sha256 `8249669b590302b4fe5a5214a95f0ca97456e3430cb2124b06eaaa0192d9183c`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
