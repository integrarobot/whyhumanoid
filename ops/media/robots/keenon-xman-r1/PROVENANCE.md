# XMAN-R1 (KEENON Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** KEENON Robotics's. No open licence is presumed. The site credits it as "Image: KEENON Robotics, XMAN-R1 manufacturer render".
- **Page:** https://universalsystems.com.au/wp-content/uploads/2026/02/KEENON-Robotics-Company-Introduction-Copy.pdf
- **File:** https://universalsystems.com.au/wp-content/uploads/2026/02/KEENON-Robotics-Company-Introduction-Copy.pdf
- **Context (Codex):** KEENON authored company introduction PDF, hosted by distributor Universal Systems, not maker-hosted. PDF page11 explicitly XMAN-R1: ENGINEERED TO SERVE; embedded image002 native2673x1612 shows whole XMAN-R1 head, both arms/hands and compact wheeled base, isolated from empty science-fiction corridor scene by non-generative mask. Existing manufacturer product render, not hardware photo. Robot occupies central figure about1200px tall. Exclude circular wall lamp behind head, bright floor border and floor shadow/reflection; preserve all robot parts/native RGB. Maker website CDN originals returned403, this brochure copy is independently readable alternative. No open licence or capability evidence asserted.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/keenon-xman-r1/`.
- **Original:** `original.png`, 2673 × 1612 px, RGB, 2,355,324 bytes, sha256 `836dba1888d81f473c8baa37877964c5e6543bed99436589d6244e8ade7cfeda` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [950, 60, 1720, 1560], alpha bounding box [234, 127, 622, 1381], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `3504dc8a1cae8a5c569b1adb61623d6f06c2c19e91c81798d085720261d8293f`, mask sha256 `f6a6228df76b4925023a0bd2e52390912c80faf9483c029ad1d551e5230a4e42`.

## Catalogue identity

- **Record:** catalogue id 187, Lab "KEENON Robotics", Robot "XMAN-R1".
- The image on page 11 of KEENON's company introduction ("XMAN-R1: Engineered to serve"), a manufacturer render at its native 2673 × 1612; the copy read is hosted by a distributor. The whole robot with head, both arms and hands and its compact wheeled base. The corridor scene, the wall lamp behind the head, the floor border and the floor reflection are excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 13, PR not yet merged)

- **PNG:** `assets/robots/keenon-xman-r1/keenon-xman-r1-full-body.png`, 428 × 1294 px, sha256 `3504dc8a1cae8a5c569b1adb61623d6f06c2c19e91c81798d085720261d8293f` (= the prepared.png).
- **WebP:** `assets/robots/keenon-xman-r1/keenon-xman-r1-full-body.webp`, sha256 `60fe75a86bd8f332a875dccec20aa8adc1ec5338973e10abaf7c69526b7c8c33`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
