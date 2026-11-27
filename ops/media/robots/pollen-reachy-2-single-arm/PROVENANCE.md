# Reachy 2 (Pollen): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** PollenRobotics's. No open licence is presumed. The site credits it as "Image: Pollen Robotics, Reachy 2 single-arm mobile-base configuration, technical render".
- **Page:** https://pollen-robotics.com/assets/reachy2/datasheets/reachy2-single-arm-mobile-base.pdf
- **File:** https://pollen-robotics.com/assets/reachy2/datasheets/reachy2-single-arm-mobile-base.pdf
- **Context (Codex):** Manufacturer Reachy2 Single Arm mobile Datasheet, PDFpage1, embeddednative1920x1920image008 and native softmask009. Whole mobile platform with one arm BY DESIGN, all antennae/gripper and complete open mobile chassis; existing manufacturer technical render. Apply supplied source-mask only; do not invent secondarm or hide actual open chassis. Caption explicitly Reachy2 single-arm mobile-base configuration, technical render. Do NOT use repo reachy-mobile.png (looks legacyReachy1) or straight_posture.jpg whose base is cropped.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/pollen-reachy2-single-arm/`.
- **Original:** `original.png`, 1920 × 1920 px, RGB, 549,754 bytes, sha256 `358ff418b55219a8490da80fe29c8983b46a6187ad9ad06371f2c08fa3d2c439` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: manufacturer's own soft mask of the image (source-mask.png, PDF page 1, image 9), unlevelled 0..255; largest region kept); crop ROI [465, 36, 1248, 1897], alpha bounding box [19, 19, 765, 1843], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `14dbabcd610dc34b27232f8e1db2839d81bc3cd0165321e17965ca239255fae4`, mask sha256 `09d743a30d3dc2d45f14b734f053d92c490df5f0ee8a584ae1174d421724c519`.

## Catalogue identity

- **Record:** catalogue id 67, Lab "Pollen", Robot "Reachy 2".
- The image on page 1 of Pollen Robotics' own datasheet for the Reachy 2 single-arm mobile-base configuration (an existing manufacturer render, extracted at its native 1920 × 1920 with the datasheet's own soft mask): the whole robot with one arm by design, both antennae, the gripper and the complete open mobile base. No second arm is added and the open chassis is not hidden. The record is Reachy 2; this image shows its single-arm configuration only.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 12, PR not yet merged)

- **PNG:** `assets/robots/pollen-reachy-2-single-arm/pollen-reachy-2-single-arm-full-body.png`, 786 × 1864 px, sha256 `14dbabcd610dc34b27232f8e1db2839d81bc3cd0165321e17965ca239255fae4` (= the prepared.png).
- **WebP:** `assets/robots/pollen-reachy-2-single-arm/pollen-reachy-2-single-arm-full-body.webp`, sha256 `5f3ea11bcdccb5216d67297eac895650ccaa2e21d515fb1dfb5a45f31841d5cd`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
