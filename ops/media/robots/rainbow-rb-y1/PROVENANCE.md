# RB-Y1 (Rainbow Robotics): full-body image, provenance and trim

Not published from here: `ops/` is excluded from the site. Image batch 1 (Javier, 27 Nov 2026: batches of 10, transparent background, whole robot).

## Source

- **Image:** Rainbow Robotics's. No open licence is presumed. The site credits it as "Image: Rainbow Robotics". Authorised by Javier for popular robots (23 Nov 2026).
- **Page:** https://rainbow-robotics.com/products/rb-y1/
- **File:** https://rainbow-robotics.com/wp-content/uploads/rainbow-media-kit/2026-08/rby-rb-y1-front-1024x1024.png
- **Downloaded:** by Codex on 27 Nov 2026, unmodified, and handed over as a chat attachment.
- **Original kept here:** `rby-rb-y1-front-1024x1024.png`, 1024 × 1024 px, RGBA PNG (alpha 0 to 255), 166,183 bytes, sha256 `deb76698883b4b13aaf144365cee580f2d0e88c873fe4583001a3283eae3cce8`. This is the SHA-256 Codex recorded for the download, so the bytes are the official file's.
- **Checked by Codex:** identity, whole robot and real alpha, on light and dark grounds; no annotations or props.

## Catalogue identity

- **Record:** catalogue id 162, Lab "Rainbow", Robot "RB-Y1".
- Rainbow Robotics media kit image of the RB-Y1, front view, on its wheeled base. The record covers the A and M versions; the alt text claims no version. Not Hubo (id 70).

## Trim here (no alpha change)

The original already carries real transparency, so no cutout was made. `python3 ops/media/robots/trim.py rby-rb-y1-front-1024x1024.png out.png` only crops to the visible figure with a 10 px margin (log in `trim-log.json`: crop box [320, 76, 670, 956], no scaling).

- Every pixel with alpha above 0 keeps its alpha and colour exactly (checked on 27 Nov 2026); no visible pixel lies outside the crop.
- Fully transparent pixels have their colour set to 0.
- Nothing is repainted, generated, extended or thresholded.

## Published files (image batch 1, PR 196, merge 4011f1e, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/rainbow-rb-y1/rb-y1-full-body.png`, 350 × 880 px, lossless, sha256 `7600d06bee9b3741de2d842e7f39920e0c564abe7f9e7bd7ab0926c6460dd463`.
- **WebP:** `assets/robots/rainbow-rb-y1/rb-y1-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha), sha256 `307ba7d382c03ad7cbf2f5e3252053bff86a6ad7b2da61a0fcc255084f5c0ea9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
