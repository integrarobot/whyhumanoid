# NAVIAI WA2 (ZJ Humanoid): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** NAVIAI's. No open licence is presumed. The site credits it as "Image: NAVIAI, WA2 manufacturer diagram".
- **Page:** https://www.zj-humanoid.com/zujian/10
- **File:** https://www.zj-humanoid.com/uploads/upload/images/20260814/fe30a0cd6d532ee432849aae6dd95ded.png
- **Context (Codex):** Official exact WA2 product page technical specification image750x2867. Choose one complete actual WA2 platform at native scale, exclude other views/text. Do not confuse with i3 or crop base, inspect annotations. Manufacturer diagram, not hardware photograph.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/naviai-wa2/`.
- **Original:** `original.png`, 750 × 2867 px, P, 365,924 bytes, sha256 `dcb836112157146d16b661a58eaa56cb61a0cb1000c874eba158b21d5d89e088` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [120, 790, 700, 1420], alpha bounding box [89, 32, 363, 591], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `4fa567326c13e0e848b0fbd0f875b021f6405da93afd171c0ea7c1f157b531a6`, mask sha256 `27f7f4c4afe9a49f1508036ef3d60b3a6ab65980cc335e6c5d62f8f472c95815`.

## Catalogue identity

- **Record:** catalogue id 210, Lab "ZJ Humanoid", Robot "NAVIAI WA2".
- The complete WA2 drawing from ZJ Humanoid's official WA2 product page specification image: the whole wheeled platform; the other views, labels and callout lines are excluded by the alpha mask. A manufacturer diagram, not a hardware photograph; not the i3. The record is NAVIAI WA2.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 11, PR not yet merged)

- **PNG:** `assets/robots/naviai-wa2/naviai-wa2-full-body.png`, 314 × 599 px, sha256 `4fa567326c13e0e848b0fbd0f875b021f6405da93afd171c0ea7c1f157b531a6` (= the prepared.png).
- **WebP:** `assets/robots/naviai-wa2/naviai-wa2-full-body.webp`, sha256 `c044a89557c3f0c91f5c9d90cddc0a01b5d33fdd497def30469250ac88fdb354`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
