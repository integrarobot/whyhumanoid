# FF Futurist (Faraday Future): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Faraday Future's. No open licence is presumed. The site credits it as "Image: Faraday Future".
- **Page:** https://robotics.ff.com/us/ff-futurist/
- **File:** https://genesis-cdn.ff.com/robot-comparasion/futurist-draft-default.jpg
- **Context (Codex):** FF Futurist initial design shown in official comparison futurist-draft-default.jpg. Not the June2026 All-New Futurist/A3 rendering. Native375x728 cutout, no upscale.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 2daba0a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/ff-futurist/`.
- **Original:** `original.jpg`, 800 × 800 px, RGB, 48,091 bytes, sha256 `06c726db87e694599aecaf66b02b9974c69683749a0417e0e3a9419ca5d1b6b5` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small background components removed.); crop ROI [0, 0, 800, 800], alpha bounding box [269, 78, 604, 766], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `cdfa1f149cf724dfb07dccd2d455a21dd4860aadc2a0f9fcc8db3042a31be940`) and the mask (sha256 `ed08236a1b74662fcd0d7019156d48343eb8d692484a418d339b59448df7e167`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 106, Lab "Faraday Future", Robot "FF Futurist".
- FF Futurist from Faraday Future's official robotics comparison image (futurist-draft-default.jpg): the initial design shown in February 2026, not the "All-New Futurist" (A3) shown in June 2026.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

- **Quality:** Modest resolution: 375 × 728 native cutout; no upscaling. Replace when a larger faithful image of this design is found.

## Published files (image batch 6, PR 216, merge b24a276, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/faraday-future-ff-futurist/faraday-future-ff-futurist-full-body.png`, 375 × 728 px, sha256 `cdfa1f149cf724dfb07dccd2d455a21dd4860aadc2a0f9fcc8db3042a31be940` (= Codex's prepared.png).
- **WebP:** `assets/robots/faraday-future-ff-futurist/faraday-future-ff-futurist-full-body.webp`, sha256 `4956f093148af908f3cb2144bde202eb0cc135da459c0b71867001ad47bcb91b`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
