# Mabel (Mabel): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** MABEL project's. No open licence is presumed. The site credits it as "Image: MABEL project".
- **Page:** https://robotmabel.github.io/website/index.html
- **File:** https://robotmabel.github.io/website/assets/wild/w-curtain.jpg
- **Context (Codex):** Official MABEL project website image caption MABEL standing in front of a grey curtain. Whole robot with both antennas, manipulators, support column, cables and base. Curtain masked; source RGB/native scale retained.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/mabel/`.
- **Original:** `original.jpg`, 1200 × 1600 px, RGB, 218,573 bytes, sha256 `3af3cf078462eada5cca1e6ea99e9f4ed1e8bf419ff23669e7d85b1ffea08b00` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad; Reviewed opaque robot interiors restored to255 inside eroded silhouette, originalRGB unchanged.); crop ROI [0, 0, 1200, 1600], alpha bounding box [174, 198, 1012, 1519], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `18ab188a991e7d3630e0ce4b824ae08deff9280adebfc59eafbbe639d4642e90`, mask sha256 `726d5dd7f1a21be58c93777e7f0dc671d4124b2fb9a31b4a1f8cdfd6e5d70bc1`.

## Catalogue identity

- **Record:** catalogue id 133, Lab "Mabel", Robot "Mabel".
- Image from the official MABEL project website (caption: MABEL standing in front of a grey curtain); the whole robot with both antennas, both manipulators, column, cables and base. The record is MABEL v1.0, an open-source mobile bimanual robot.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 9, PR not yet merged)

- **PNG:** `assets/robots/mabel/mabel-full-body.png`, 878 × 1361 px, sha256 `18ab188a991e7d3630e0ce4b824ae08deff9280adebfc59eafbbe639d4642e90` (= the prepared.png).
- **WebP:** `assets/robots/mabel/mabel-full-body.webp`, sha256 `63edccc46c4479d3c20000eadbb7b961a96cf93741938e2b1c621e749253c428`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
