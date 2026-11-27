# SE01 (EngineAI): full-body image, provenance and trim

Not published from here: `ops/` is excluded from the site. Image batch 1 (Javier, 27 Nov 2026: batches of 10, transparent background, whole robot).

## Source

- **Image:** EngineAI's. No open licence is presumed. The site credits it as "Image: EngineAI". Authorised by Javier for popular robots (23 Nov 2026).
- **Page:** https://en.engineai.com.cn/product-se01
- **File:** https://en-engineai-sv-1304599088.cos.na-siliconvalley.myqcloud.com/uploads/frame/Se2/Se02_00000.png
- **Downloaded:** by Codex on 27 Nov 2026, unmodified, and handed over as a chat attachment.
- **Original kept here:** `Se02_00000.png`, 800 × 800 px, RGBA PNG (alpha 0 to 255), 236,746 bytes, sha256 `f72ee1a530861d94f1020d6a23efa4c2b551b35f5cbf075425955139dd3f3b26`. This is the SHA-256 Codex recorded for the download, so the bytes are the official file's.
- **Checked by Codex:** identity, whole robot and real alpha, on light and dark grounds; no annotations or props.

## Catalogue identity

- **Record:** catalogue id 27, Lab "Engineai", Robot "SE01".
- The file is named Se02_00000.png, but the name is technical, not the model: on the official page product-se01, titled SE01, this image carries alt="SE01" (Codex, 27 Nov 2026). Not PM01 (id 150) nor T800 (id 151). Codex rejected the page's smaller opaque image (engfwqfimg1).

## Trim here (no alpha change)

The original already carries real transparency, so no cutout was made. `python3 ops/media/robots/trim.py Se02_00000.png out.png` only crops to the visible figure with a 10 px margin (log in `trim-log.json`: crop box [259, 0, 541, 797], no scaling).

- Every pixel with alpha above 0 keeps its alpha and colour exactly (checked on 27 Nov 2026); no visible pixel lies outside the crop.
- Fully transparent pixels have their colour set to 0.
- Nothing is repainted, generated, extended or thresholded.

## Files integrated (image batch 1, PR not yet merged)

- **PNG:** `assets/robots/engineai-se01/se01-full-body.png`, 282 × 797 px, lossless, sha256 `8f0ca32605d6a25276be8c7404dc4d940a15c5a806743f2ef3df79f5f0fdf434`.
- **WebP:** `assets/robots/engineai-se01/se01-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha), sha256 `4e80550eb7a966a6fbb8e0d0f7885f0eafcb6b19ef46ffcc28475a30334604d9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
