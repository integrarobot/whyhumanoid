# S1 (Astribot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Astribot's. No open licence is presumed. The site credits it as "Image: Astribot, S1 video still".
- **Page:** https://www.astribot.com/
- **File:** https://www.astribot.com/index/s2test/index-s2-test.webp
- **Context (Codex):** Official homepage video poster1920x1080. Burnt-in bottom-right caption explicitly says Astribot S1; robot whole down to complete wheeled base, both arms/grippers visible. The technical directory index/s2test is not evidence of a robot S2: read the image caption and product context. Credit manufacturer video still, not a capability claim. Exclude source subtitles from mask.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/astribot-s1/`.
- **Original:** `original.webp`, 1920 × 1080 px, RGB, 70,656 bytes, sha256 `a314d0a35f02d232631ca46463032a752cc976cdc480d2f092f87cdb6718a889` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [600, 150, 1300, 1060], alpha bounding box [150, 108, 592, 858], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `530355ad5dfe4e651deae826ec93a4788c18402280c8e5354037a4c20a3c9a5d`, mask sha256 `300eba5337cb2a8c65b2c3f1be69029a29123be3add55ebc0ca9973e2e6f17cd`.

## Catalogue identity

- **Record:** catalogue id 10, Lab "Astribot", Robot "S1".
- Poster frame of the official home-page video, whose burnt-in caption reads Astribot S1: the whole robot down to its wheeled base, both arms and grippers; the room and the subtitles are excluded. The s2test directory in the file path is not evidence of another model. A video still, not a capability claim. The record is S1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 11, PR not yet merged)

- **PNG:** `assets/robots/astribot-s1/astribot-s1-full-body.png`, 482 × 790 px, sha256 `530355ad5dfe4e651deae826ec93a4788c18402280c8e5354037a4c20a3c9a5d` (= the prepared.png).
- **WebP:** `assets/robots/astribot-s1/astribot-s1-full-body.webp`, sha256 `1fe014534f37e4a3cc567d235716af90fad2d19b769a6281af06b688da5136da`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
