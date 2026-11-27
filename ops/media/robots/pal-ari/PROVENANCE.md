# ARI (PAL Robotics): full-body image, provenance and trim

Not published from here: `ops/` is excluded from the site. Image batch 1 (Javier, 27 Nov 2026: batches of 10, transparent background, whole robot).

## Source

- **Image:** PAL Robotics's. No open licence is presumed. The site credits it as "Image: PAL Robotics". Authorised by Javier for popular robots (23 Nov 2026).
- **Page:** https://pal-robotics.com/robot/ari/
- **File:** https://pal-robotics.com/wp-content/uploads/2024/05/ARI-header-918x1024.webp
- **Downloaded:** by Codex on 27 Nov 2026, unmodified, and handed over as a chat attachment.
- **Original kept here:** `ARI-header-918x1024.webp`, 918 × 1024 px, RGBA WebP (alpha 0 to 255), 36,244 bytes, sha256 `9419c32a66839c38e7f3fcfc8b1c3d969df6c222b281e03df1949208ecc8944b`. This is the SHA-256 Codex recorded for the download, so the bytes are the official file's.
- **Checked by Codex:** identity, whole body and real alpha, on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 152, Lab "PAL", Robot "ARI".
- PAL's ARI product page header image: the wheeled social humanoid with its chest screen. The soft contact shadow under the base is part of the original's alpha and is kept.

## Trim here (no alpha change)

The original already carries real transparency, so no cutout was made. `python3 ops/media/robots/trim.py ARI-header-918x1024.webp out.png` only crops to the visible figure with a 10 px margin (log in `trim-log.json`: crop box [234, 8, 760, 1024], no scaling).

- Every pixel with alpha above 0 keeps its alpha and colour exactly (checked on 27 Nov 2026); no visible pixel lies outside the crop.
- Fully transparent pixels have their colour set to 0.
- Nothing is repainted, generated, extended or thresholded.

## Published files (image batch 1, PR 196, merge 4011f1e, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/pal-ari/ari-full-body.png`, 526 × 1016 px, lossless, sha256 `7f7bf280fe4d128f421937273044e6c5d712b726f8cb2dc8182a3072b4444547`.
- **WebP:** `assets/robots/pal-ari/ari-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha), sha256 `0080a292915e6147f6eae2551faaf5d17f7d7db792b446c2f6170d34437a60e6`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
