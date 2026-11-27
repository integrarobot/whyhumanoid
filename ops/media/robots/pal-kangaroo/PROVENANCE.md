# Kangaroo (PAL Robotics): full-body image, provenance and trim

Not published from here: `ops/` is excluded from the site. Image batch 1 (Javier, 27 Nov 2026: batches of 10, transparent background, whole robot).

## Source

- **Image:** PAL Robotics's. No open licence is presumed. The site credits it as "Image: PAL Robotics". Authorised by Javier for popular robots (23 Nov 2026).
- **Page:** https://pal-robotics.com/robot/kangaroo/
- **File:** https://pal-robotics.com/wp-content/uploads/2025/10/KOO-7DoF-1-644x1024.png
- **Downloaded:** by Codex on 27 Nov 2026, unmodified, and handed over as a chat attachment.
- **Original kept here:** `KOO-7DoF-1-644x1024.png`, 644 × 1024 px, PNG with palette transparency (alpha 0 to 255), 121,485 bytes, sha256 `d873a4e8defedb74523e7e352a5d4222f3e39a51635bd21301ae5ca13dd1a815`. This is the SHA-256 Codex recorded for the download, so the bytes are the official file's.
- **Checked by Codex:** identity, whole robot and real alpha, on light and dark grounds; no annotations or props.

## Catalogue identity

- **Record:** catalogue id 154, Lab "PAL", Robot "Kangaroo".
- PAL's KANGAROO page image: the whole platform as PAL presents it, without a head. No head is added or suggested. Not TALOS (id 61). The earlier featured image (RobotFeatured-KANGAROO.webp) was rejected by Codex: an opaque rectangle behind the body despite transparent corners. This file has no such rectangle. Three isolated specks of 2 px each in the original are kept as they are.

## Trim here (no alpha change)

The original already carries real transparency, so no cutout was made. `python3 ops/media/robots/trim.py KOO-7DoF-1-644x1024.png out.png` only crops to the visible figure with a 10 px margin (log in `trim-log.json`: crop box [41, 33, 599, 978], no scaling).

- Every pixel with alpha above 0 keeps its alpha and colour exactly (checked on 27 Nov 2026); no visible pixel lies outside the crop.
- Fully transparent pixels have their colour set to 0.
- Nothing is repainted, generated, extended or thresholded.

## Published files (image batch 1, PR 196, merge 4011f1e, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/pal-kangaroo/kangaroo-full-body.png`, 558 × 945 px, lossless, sha256 `a0e8b3e8fa1e0e48eac51008e55b004e9274c3e751444a5ff5f1c50df7e1ab22`.
- **WebP:** `assets/robots/pal-kangaroo/kangaroo-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha), sha256 `11961db6e530da669b6b00301ed364e2591d9c466fb98983b8d61bd20871917a`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
