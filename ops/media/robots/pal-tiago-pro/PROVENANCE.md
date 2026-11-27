# TIAGo Pro (PAL Robotics): full-body image, provenance and trim

Not published from here: `ops/` is excluded from the site. Image batch 1 (Javier, 27 Nov 2026: batches of 10, transparent background, whole robot).

## Source

- **Image:** PAL Robotics's. No open licence is presumed. The site credits it as "Image: PAL Robotics". Authorised by Javier for popular robots (23 Nov 2026).
- **Page:** https://pal-robotics.com/robot/tiago-pro/
- **File:** https://pal-robotics.com/wp-content/uploads/2025/01/TIAGoPro_Sided1_Mobile-Manipulator_PAL-Robotics-921x1024.webp
- **Downloaded:** by Codex on 27 Nov 2026, unmodified, and handed over as a chat attachment.
- **Original kept here:** `TIAGoPro_Sided1_Mobile-Manipulator_PAL-Robotics-921x1024.webp`, 921 × 1024 px, RGBA WebP (alpha 0 to 255), 56,206 bytes, sha256 `066dacd25f40f95d1bca8eeb4444e431da06cc5a7afb9e9ab106ec6a87874711`. This is the SHA-256 Codex recorded for the download, so the bytes are the official file's.
- **Checked by Codex:** identity, whole robot and real alpha, on light and dark grounds; no annotations or props.

## Catalogue identity

- **Record:** catalogue id 153, Lab "PAL", Robot "TIAGo Pro".
- PAL's TIAGo Pro product page image: the dual-arm robot on its omnidirectional wheeled base. Not the earlier TIAGo.

## Trim here (no alpha change)

The original already carries real transparency, so no cutout was made. `python3 ops/media/robots/trim.py TIAGoPro_Sided1_Mobile-Manipulator_PAL-Robotics-921x1024.webp out.png` only crops to the visible figure with a 10 px margin (log in `trim-log.json`: crop box [175, 64, 723, 1020], no scaling).

- Every pixel with alpha above 0 keeps its alpha and colour exactly (checked on 27 Nov 2026); no visible pixel lies outside the crop.
- Fully transparent pixels have their colour set to 0.
- Nothing is repainted, generated, extended or thresholded.

## Published files (image batch 1, PR 196, merge 4011f1e, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/pal-tiago-pro/tiago-pro-full-body.png`, 548 × 956 px, lossless, sha256 `7fcfca073eeca2e87ca7c004e7296e5333eae9d26cdbd867e0bc9eb4178e2dcc`.
- **WebP:** `assets/robots/pal-tiago-pro/tiago-pro-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha), sha256 `3aaa2fa2833069a2ec62a7b6f0b699d6fa1b57b0be3533b22dd2e65fd906d3d9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
