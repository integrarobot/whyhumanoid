# Gino 1 (Geek+): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 17, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Geekplus's. No open licence is presumed. The site credits it as "Image: Geekplus, Gino 1 official video still, rear view with backpack basket (2026)".
- **Page:** https://www.youtube.com/watch?v=GFYhyjurf_U
- **File:** https://www.youtube.com/watch?v=GFYhyjurf_U
- **Context (Codex):** Official Geekplus Logistics & Warehouse Automation channel video. Select single complete robot in REAR VIEW at nativeframe4238 (169.52seconds/25fps,1920x1080), approximateROI x1000..1390 y160..930. Head, both real hands, whole column and wheeled base complete, without another object/person overlapping outline. Keep white slotted BACKPACK BASKET attached to back as part of this actual configuration; never pretend frontview or erase basket/reconstruct hidden back. Nativeframe examined: wholebody~720px high, no upscaling. Remove floor/reflection/LEDglow spill and all shelf/otherrobot/text, preserving actual chassis lights and supportcaster hardware. Shelf bolt/rail at left elbow is background; actual black basket-side cable near right elbow belongs to robot, inspect carefully at native. Mandatory caption Geekplus, Gino1 official video still, rear view with backpack basket (2026). Video identifies exact Gino1; no inference of autonomy/performance from image. Frontviews in this video generally clip base; aerial frontframe4069 whole but~354px body and not enough native resolution, so not selected. This solves previously cropped still; no specs/modelcategory changes.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit c21bf62 (candidates-44), 56c65d0 (candidates-45), 5c11af4 (candidates-46) and acda4f4 (candidates-47)); kept in `ops/media/intake-remaining-2026-11-27/batch-17/geekplus-gino1-native-rear-view/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 1,763,812 bytes, sha256 `0cb64e184eaa56896c015a554b4edae472bbfa7e37b701a0f77c092a3695c02d` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240); crop ROI [990, 150, 1400, 940], alpha bounding box [40, 38, 354, 755], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `51a56f075fcf83528c91fdca4ff477e81f9c8022bbe832acf7433497e8dd0037`, mask sha256 `183ef018c91ea66040438041041ee6d5d8157da667b37db73fef7fbe17e096f0`.

## Catalogue identity

- **Record:** catalogue id 213, Lab "Geek+", Robot "Gino 1".
- Frame 4238 (169.52 s) of Geekplus' video of 13 April 2026, at its native 1920 × 1080: the whole Gino 1 seen from behind, with head, both hands, the white slotted backpack basket and its side cable, the column and the complete wheeled base. It is a rear view; the hidden front is not reconstructed. The warehouse shelving, the floor and its reflection are excluded by the alpha mask, and the subtitles lie below the figure.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 17, PR not yet merged)

- **PNG:** `assets/robots/geekplus-gino-1/geekplus-gino-1-full-body.png`, 354 × 757 px, sha256 `51a56f075fcf83528c91fdca4ff477e81f9c8022bbe832acf7433497e8dd0037` (= the prepared.png).
- **WebP:** `assets/robots/geekplus-gino-1/geekplus-gino-1-full-body.webp`, sha256 `4d3a7436e7f0f9da933016355b7b35798eb472abc5bc440fb22d905877c02fb9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
