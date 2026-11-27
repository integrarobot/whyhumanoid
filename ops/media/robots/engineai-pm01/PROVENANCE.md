# PM01 (EngineAI): full-body image, provenance and trim

Not published from here: `ops/` is excluded from the site. Image batch 1 (Javier, 27 Nov 2026: batches of 10, transparent background, whole robot).

## Source

- **Image:** EngineAI's. No open licence is presumed. The site credits it as "Image: EngineAI". Authorised by Javier for popular robots (23 Nov 2026).
- **Page:** https://en.engineai.com.cn/product-pm01
- **File:** https://en-engineai-sv-1304599088.cos.na-siliconvalley.myqcloud.com/uploads/frame/PM01/PM01_00000.png
- **Downloaded:** by Codex on 27 Nov 2026, unmodified, and handed over as a chat attachment.
- **Original kept here:** `PM01_00000.png`, 800 × 800 px, RGBA PNG (alpha 0 to 255), 237,335 bytes, sha256 `bcf2e35125a6ba0daf176a24ebc06c1a7a26aaaed78c620ede86bc407862b4b1`. This is the SHA-256 Codex recorded for the download, so the bytes are the official file's.
- **Checked by Codex:** identity, whole body and real alpha, on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 150, Lab "Engineai", Robot "PM01".
- The first frame of the product page image sequence for PM01 (file PM01_00000.png), on EngineAI's product page for PM01. The torso is marked "PM". The record covers the 2026 Education and Navigation editions; the alt text claims no edition. Not SE01 (id 27) nor T800 (id 151).

## Trim here (no alpha change)

The original already carries real transparency, so no cutout was made. `python3 ops/media/robots/trim.py PM01_00000.png out.png` only crops to the visible figure with a 10 px margin (log in `trim-log.json`: crop box [241, 0, 558, 800], no scaling).

- Every pixel with alpha above 0 keeps its alpha and colour exactly (checked on 27 Nov 2026); no visible pixel lies outside the crop.
- Fully transparent pixels have their colour set to 0.
- Nothing is repainted, generated, extended or thresholded.

## Files integrated (image batch 1, PR not yet merged)

- **PNG:** `assets/robots/engineai-pm01/pm01-full-body.png`, 317 × 800 px, lossless, sha256 `e9ee23fa00a322055fe39f8d6d1d9524d3d1038281e52f100b2b1a5d5ce4046f`.
- **WebP:** `assets/robots/engineai-pm01/pm01-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha), sha256 `d471c8874cb2ff2c1d65cbfbd30f247a2e4f8923fd2eea62ebffb09563199cff`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
