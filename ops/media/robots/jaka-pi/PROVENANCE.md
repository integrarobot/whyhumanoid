# JAKA π (JAKA Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** JAKA Robotics's. No open licence is presumed. The site credits it as "Image: JAKA Robotics, JAKA π official video still (July 2026)".
- **Page:** https://www.youtube.com/watch?v=CYsgHnhwRY0
- **File:** https://www.youtube.com/watch?v=CYsgHnhwRY0
- **Context (Codex):** Select ONLY isolated central foreground robot, approximate native ROI x850..1150 y330..1050. Native head, both simple hands and both feet whole, no people/other robot crossing the contour. Hands are simple original grippers, not human fingers. Manufacturer video JAKA pi Humanoid Robots Show Dynamic Movement, published 2026-07-22; native 1920x1080, frame2707 at90.2333seconds/30fps. Black/white outdoor figure, keep source RGB and green chest light. Remove all other robots, asphalt, curb, buildings and shadow through alpha only. Honest caption JAKA Robotics, JAKA pi official video still, July2026. Different from watermarked running photograph on news1655, which was not selected. No claim of autonomy or performance from this image.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41) and 1c2c9a0 (candidates-42)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/jaka-pi-native-video/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 2,074,201 bytes, sha256 `1f42fa852d04e663d8ccbb3fc5885bfd13052bcd9decb058937c2e310624d284` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240); crop ROI [840, 320, 1170, 1065], alpha bounding box [32, 22, 282, 717], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `fc6993e3d36c9387df4f838129f1f824bcf84d327afa4493396af2fe325b9658`, mask sha256 `bb3ec3b373078de13f23aec357aed4e0f51ebacbab1a461e3448a7c8c24de46d`.

## Catalogue identity

- **Record:** catalogue id 184, Lab "JAKA Robotics", Robot "JAKA π".
- Frame 2707 (90.23 s) of JAKA Robotics' video of 22 July 2026, at its native 1920 × 1080: the central foreground robot, whole, with head, both simple hands and both feet. The other robots, the asphalt, the kerb, the buildings and the shadow are excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 16, PR 251, merge 43d8984, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/jaka-pi/jaka-pi-full-body.png`, 290 × 735 px, sha256 `fc6993e3d36c9387df4f838129f1f824bcf84d327afa4493396af2fe325b9658` (= the prepared.png).
- **WebP:** `assets/robots/jaka-pi/jaka-pi-full-body.webp`, sha256 `6a181498e4ab4231b3cc3cee59bf2305b7b465145ebd7b0228c68d6b54092d53`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
