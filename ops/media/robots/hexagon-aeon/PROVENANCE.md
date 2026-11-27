# AEON (Hexagon): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Hexagon's. No open licence is presumed. The site credits it as "Image: Hexagon, AEON animation still".
- **Page:** https://robotics.hexagon.com/product/
- **File:** https://robotics.hexagon.com/wp-content/uploads/2026/10/On-Wheels.mp4
- **Context (Codex):** Existing official product animation On-Wheels.mp4, frame105 at4.2seconds,1280x720 native. Full AEON on wheels side view. This is an official animation still/render, not hardware photograph. Source frame unchanged, no generated anatomy.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/hexagon-aeon/`.
- **Original:** `original.png`, 1280 × 720 px, RGB, 323,372 bytes, sha256 `8f70a1d9b1d608dc5cbc5aadc492c7da52412505b4284fe89c69bc75cfbf5a7f` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Alpha50..235;largest connected figure;20px transparent pad;source RGB/native resolution preserved. Independent visual review required.); crop ROI [450, 0, 900, 720], alpha bounding box [61, 52, 230, 529], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `266383e4ed1116f37628f56e4327290a18f6a6daa02918193369dca7d403e486`, mask sha256 `5f7910d5a47dfaa86bf6e0c0ec20b537542dd297e0bee03edea2bfa7cd28f26a`.

## Catalogue identity

- **Record:** catalogue id 40, Lab "Hexagon", Robot "AEON".
- Frame 105 (4.2 s at 25 fps) of Hexagon's official product animation On-Wheels.mp4, 1280 × 720: the whole AEON on wheels. It is an official animation still, not a hardware photograph. The record is AEON with wheeled mobility.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

- **Quality:** Animation still at native size: 209 × 517 px as prepared, not enlarged.

## Published files (image batch 10, PR 232, merge 4db495d, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/hexagon-aeon/hexagon-aeon-full-body.png`, 209 × 517 px, sha256 `266383e4ed1116f37628f56e4327290a18f6a6daa02918193369dca7d403e486` (= the prepared.png).
- **WebP:** `assets/robots/hexagon-aeon/hexagon-aeon-full-body.webp`, sha256 `1645ca59961258734da362a6aa89afb0b983e6dba43390a86f0a17e6d5d35941`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
