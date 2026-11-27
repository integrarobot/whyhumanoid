# Talos (PAL Robotics): full-body image, provenance and trim

Not published from here: `ops/` is excluded from the site. Image batch 1 (Javier, 27 Nov 2026: batches of 10, transparent background, whole robot).

## Source

- **Image:** PAL Robotics's. No open licence is presumed. The site credits it as "Image: PAL Robotics". Authorised by Javier for popular robots (23 Nov 2026).
- **Page:** https://pal-robotics.com/robot/talos/
- **File:** https://pal-robotics.com/wp-content/uploads/2024/04/TALOS-Robot-918x1024.webp
- **Downloaded:** by Codex on 27 Nov 2026, unmodified, and handed over as a chat attachment.
- **Original kept here:** `TALOS-Robot-918x1024.webp`, 918 × 1024 px, RGBA WebP (alpha 0 to 255), 44,058 bytes, sha256 `4c08964faf4ee434da9e2186309c46b34a539a94cc835a70de0616261539a74c`. This is the SHA-256 Codex recorded for the download, so the bytes are the official file's.
- **Checked by Codex:** identity, whole body and real alpha, on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 61, Lab "PAL", Robot "Talos".
- PAL's TALOS product page image. Not KANGAROO (id 154).

## Trim here (no alpha change)

The original already carries real transparency, so no cutout was made. `python3 ops/media/robots/trim.py TALOS-Robot-918x1024.webp out.png` only crops to the visible figure with a 10 px margin (log in `trim-log.json`: crop box [175, 87, 753, 938], no scaling).

- Every pixel with alpha above 0 keeps its alpha and colour exactly (checked on 27 Nov 2026); no visible pixel lies outside the crop.
- Fully transparent pixels have their colour set to 0.
- Nothing is repainted, generated, extended or thresholded.

## Files integrated (image batch 1, PR not yet merged)

- **PNG:** `assets/robots/pal-talos/talos-full-body.png`, 578 × 851 px, lossless, sha256 `c3ff530e72d872bfafcee691f73ac3f048463be4a598d0925c56f8582bd2f23c`.
- **WebP:** `assets/robots/pal-talos/talos-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha), sha256 `237659eaacaeb62a70963dca131e73515ec2071efcd3a0c11cd630322d7d0cd3`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
