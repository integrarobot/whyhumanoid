# Adam (PNDbotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** PNDbotics's. No open licence is presumed. The site credits it as "Image: PNDbotics, ADAM standard simulation model".
- **Page:** https://github.com/pndbotics/pnd_models (README, models table, row adam_standard)
- **File:** https://github.com/pndbotics/pnd_models/blob/38420a65d20219b095e9a78e22f0f9af7256c23f/adam_standard/imgs/adam_standard.png
- **Context:** Official PNDbotics model repository: the README models table shows this image on the adam_standard row (URDF/MJCF description model). It is a rendering of the simulation model, not a product photograph. The repository's BSD-style licence (adam_license.txt) is written for software and is not relied on: no open licence is presumed for the image.
- **Downloaded:** by Claude with git clone of github.com/pndbotics/pnd_models; the file is byte-identical to the repository blob (sha256 c913e70b…), nothing rendered here; kept in `ops/media/intake-remaining-2026-11-27/batch-08/pndbotics-adam/`.
- **Original:** `original.png`, 1237 × 1230 px, RGBA, 296,122 bytes, sha256 `c913e70b28a3e4fa3dd2d79a257aaf75ed5dfadbf8b81e2f6872f59312532af6` (equal to the manifest).
- **Preparation:** opaque original; non-generative alpha mask (birefnet-general mask (rembg, mask only); levels 85..230); crop ROI [0, 0, 1237, 1230], alpha bounding box [454, 62, 782, 1173], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `515f7f10dcf8c480d96ac8bab0d85cc71d0da2b6fcc1dc3f03c41428989e1dea`, mask sha256 `0ab2b7d0a1c590ae5b9f1c57350219401b5e8d54f4329b80ea6cdb7bcbc5ab06`.

## Catalogue identity

- **Record:** catalogue id 66, Lab "PNDbotics", Robot "Adam".
- Pre-existing file in PNDbotics' official repository github.com/pndbotics/pnd_models (adam_standard/imgs/adam_standard.png, added in commit 71eaac7 on 9 May 2025, unchanged since), shown in the README's models table on the adam_standard row. It is a rendering of the simulation (description) model, not a photograph, and need not reflect the current covers. The repository also holds adam_lite, adam_sp, adam_u and adam_inspire; which variant the catalogue record Adam (167 cm, 62 kg, specifications pending) describes is not established.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

- **Quality:** Simulation model rendering, not a hardware photograph; small source (368 × 1151 px as prepared).

## Files integrated (image batch 8, PR not yet merged)

- **PNG:** `assets/robots/pndbotics-adam/pndbotics-adam-full-body.png`, 368 × 1151 px, sha256 `515f7f10dcf8c480d96ac8bab0d85cc71d0da2b6fcc1dc3f03c41428989e1dea` (= the prepared.png).
- **WebP:** `assets/robots/pndbotics-adam/pndbotics-adam-full-body.webp`, sha256 `8a5686d0b621bebe90dc9d05dccca18a1c84e00322de96011db603be1faf4924`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
