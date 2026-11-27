# Zerith H1 (Zerith Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Zerith's. No open licence is presumed. The site credits it as "Image: Zerith Robotics".
- **Page:** https://www.zerith.com/product/ZerithH1/
- **File:** https://www.zerith.com/dist/images/img_201.png
- **Context (Codex):** Official exact H1 product page img_201.png945x945, whole side view of wheeled column, full base/hands/head. Not cropped torso cards. Inspect native alpha/background and full wheels.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e; Calvin-40 and Zerith H1: 7496b6e)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/zerith-h1/`.
- **Original:** `original.png`, 945 × 945 px, RGBA, 216,091 bytes, sha256 `6eb2326058d6d99196428e297534e82870bce089ea55ae5b2b248502f9c071ae` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha); crop ROI [0, 0, 945, 945], alpha bounding box [320, 79, 625, 841], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `66af3721332236d26ecd0128b82d5d6688cae978835d54653905dfacc0324641`, mask sha256 `50bb2a573d32e39d96d22260e2df320bd9b69d18b4b2887fad07e4525dc3f313`.

## Catalogue identity

- **Record:** catalogue id 207, Lab "Zerith Robotics", Robot "Zerith H1".
- Zerith's official H1 product page image img_201.png: the whole robot in side view on its wheeled column, with base, hands and head; not the cropped torso cards. The record is Zerith H1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 10, PR not yet merged)

- **PNG:** `assets/robots/zerith-h1/zerith-h1-full-body.png`, 345 × 802 px, sha256 `66af3721332236d26ecd0128b82d5d6688cae978835d54653905dfacc0324641` (= the prepared.png).
- **WebP:** `assets/robots/zerith-h1/zerith-h1-full-body.webp`, sha256 `da482ccfde2bb74447e8105b1e849ae6c39d8001c000408d8553082492635a13`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
