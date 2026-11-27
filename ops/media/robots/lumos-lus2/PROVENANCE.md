# LUS (Lumos): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Lumos's. No open licence is presumed. The site credits it as "Image: Lumos, LUS2".
- **Page:** https://www.lumosbot.tech/products/lus2
- **File:** https://delivery.lumosbot.tech/www/lumos-website/images/products/lus2/front.webp
- **Context (Codex):** Official /products/lus2 identifies this full front view as LUS2, native-alpha1200x3380. Catalogue is generic LUS; MUST review whether family illustration is valid and name LUS2 variant explicitly; do not silently present as original LUS generation.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 299a0d7); kept in `ops/media/intake-remaining-2026-11-27/batch-08/lumos-lus2/`.
- **Original:** `original.webp`, 1200 × 3380 px, RGBA, 120,714 bytes, sha256 `f2f23e4bf321466a24e9e44bde93cd38b9a51663de5987897ad849150c2a00a3` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (original alpha; specks removed); crop ROI [0, 0, 1200, 3380], alpha bounding box [6, 37, 1194, 3314], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `830f4a810efe6daec20bfac529279cd0228fc768658c8d2d225f9e637562d889`, mask sha256 `115b6bbd6b1460aa7fb3a71e8343000434e499fcdbd213b1220de1bd4f4504c1`.

## Catalogue identity

- **Record:** catalogue id 52, Lab "Lumos", Robot "LUS".
- The image is LUS2 (official /products/lus2 page, front.webp). The catalogue record is LUS, a family whose exact generation is unspecified in the master; the image is named LUS2 and is not presented as the first LUS generation, nor are the record's figures attributed to LUS2.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 8, PR not yet merged)

- **PNG:** `assets/robots/lumos-lus2/lumos-lus2-full-body.png`, 1228 × 3317 px, sha256 `830f4a810efe6daec20bfac529279cd0228fc768658c8d2d225f9e637562d889` (= the prepared.png).
- **WebP:** `assets/robots/lumos-lus2/lumos-lus2-full-body.webp`, sha256 `927ce3d8af593919415cb9d1c58e2f23e872eebbf5e8f8f578ef82c86b1fc5a5`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
