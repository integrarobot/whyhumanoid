# Kinisi (Bear Robotics offering) (Kinisi): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Kinisi's. No open licence is presumed. The site credits it as "Image: Kinisi".
- **Page:** https://www.bearrobotics.ai/kinisi
- **File:** https://static1.squarespace.com/static/652cbb3fb1f91809d4610dc0/t/6a61e0e34ba5343f74277a04/1784799459455/kinisi-robot-front-back-specifications.webp
- **Context (Codex):** Official Kinisi specifications image has front and back views. Isolate complete LEFT front figure; preserve whole base and wheels. Source includes opaque white internal background even though external alpha is native, so alpha alone is not automatically clean.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 299a0d7); kept in `ops/media/intake-remaining-2026-11-27/batch-08/kinisi/`.
- **Original:** `original.webp`, 1488 × 1434 px, RGBA, 659,602 bytes, sha256 `9042439920f90d2dce7ff2a8cd0c3cf4bac852aac7342af3df34a0ffa24f507b` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (birefnet-general mask (rembg, mask only); limited by the original alpha; levels 85..230); crop ROI [0, 0, 740, 1434], alpha bounding box [122, 150, 694, 1285], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `14039419fad60fb28d7e1bb785ce39bba8a57f4a0163db382b970a4f572a81e3`, mask sha256 `fbade8b666de4c97964ee7025b5f6fe25b0dabd2c210cba1bd402a05e4c0a66f`.

## Catalogue identity

- **Record:** catalogue id 48, Lab "Kinisi", Robot "Kinisi (Bear Robotics offering)".
- From the official front-and-back specifications image on Bear Robotics' Kinisi page; only the front view is kept. The original's own transparency left opaque white inside the gaps, so its alpha is limited by a segmentation mask (the lower of the two). The catalogue record is Kinisi (Bear Robotics offering).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 8, PR not yet merged)

- **PNG:** `assets/robots/kinisi/kinisi-full-body.png`, 612 × 1175 px, sha256 `14039419fad60fb28d7e1bb785ce39bba8a57f4a0163db382b970a4f572a81e3` (= the prepared.png).
- **WebP:** `assets/robots/kinisi/kinisi-full-body.webp`, sha256 `71f7bfe7fc5890fee9cc363e05dfe6839bb8772ae17a229347232295f2d49397`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
