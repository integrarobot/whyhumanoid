# H2-X (Unitree): full-body image, provenance and trim

Not published from here: `ops/` is excluded from the site. Image batch 1 (Javier, 27 Nov 2026: batches of 10, transparent background, whole robot).

## Source

- **Image:** Unitree's. No open licence is presumed. The site credits it as "Image: Unitree". Authorised by Javier for popular robots (23 Nov 2026).
- **Page:** https://www.unitree.com/H2-X/
- **File:** https://www.unitree.com/images/627867c4198c4796b0e474f953b8f903_800x800.png
- **Downloaded:** by Codex on 27 Nov 2026, unmodified, and handed over as a chat attachment.
- **Original kept here:** `627867c4198c4796b0e474f953b8f903_800x800.png`, 800 × 800 px, PNG with palette transparency (alpha 0 to 255), 56,010 bytes, sha256 `f2289b96103b1d0e9a123ee6b484277e825d06390a7eb6479fb2867e46e1a466`. This is the SHA-256 Codex recorded for the download, so the bytes are the official file's.
- **Checked by Codex:** identity, whole body and real alpha, on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 140, Lab "Unitree", Robot "H2-X".
- **Manufacturer-declared identity (Codex, 27 Nov 2026):** on the official page https://www.unitree.com/H2-X/ the image is inside this link, the active product, whose own text names the model:

  ```html
  <a aria-current="page" href="/H2-X" class="router-link-active router-link-exact-active link hashover"><img src="https://www.unitree.com/images/627867c4198c4796b0e474f953b8f903_800x800.png"><p class="name">H2-X</p><p class="desc">Next-Generation Full-S...</p></a>
  ```

  The identity rests on that block, not on reading markings on the robot (the torso shows "02"). The record covers H2-X and H2-X EDU. Not H2 (id 139).

## Trim here (no alpha change)

The original already carries real transparency, so no cutout was made. `python3 ops/media/robots/trim.py 627867c4198c4796b0e474f953b8f903_800x800.png out.png` only crops to the visible figure with a 10 px margin (log in `trim-log.json`: crop box [285, 54, 507, 735], no scaling).

- Every pixel with alpha above 0 keeps its alpha and colour exactly (checked on 27 Nov 2026); no visible pixel lies outside the crop.
- Fully transparent pixels have their colour set to 0.
- Nothing is repainted, generated, extended or thresholded.

## Files integrated (image batch 1, PR not yet merged)

- **PNG:** `assets/robots/unitree-h2-x/h2-x-full-body.png`, 222 × 681 px, lossless, sha256 `a850fd8eca99536c25662ddc5914f245c80acfa7b1377fe2b85eeef243e490df`.
- **WebP:** `assets/robots/unitree-h2-x/h2-x-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha), sha256 `3fde7dfc3c014327320749dd178ec4f61a60ba391cc00be34ac7479a2b229829`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
