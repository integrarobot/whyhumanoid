# Westlake o1 (Westlake Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Westlake Robotics's. No open licence is presumed. The site credits it as "Image: Westlake Robotics, TITAN O1 manufacturer render, running pose".
- **Page:** https://wlrobo.com/module2
- **File:** https://wlrobo.com/figma/o1/0b5f5.png
- **Context (Codex):** Exact maker O1Page-B3ZLw0hp.js references this native2162x3844 PNG for TITAN O1. Catalogue Westlake o1 family. Existing maker technical render, running pose with whole head, both hands and both feet. CAUTION original has translucent motion-trail duplicate geometry to right of foreground figure. Isolate only solid foreground full robot by alpha mask, preserve every visible RGB value and native size, no generation/repainting. If trails overlap body in a way that cannot be isolated cleanly, reject and use a primary whole video frame instead; videos referenced by same product chunk /videos/o1-1.mp4, /videos/o1-2.mp4, /videos/o1-3.mp4. Caption TITAN O1 manufacturer render, running pose; no specifications change. Root inspected native preview.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/westlake-titan-o1/`.
- **Original:** `original.png`, 2162 × 3844 px, RGBA, 3,234,520 bytes, sha256 `87ccd7a2e3758b25f1e993965cdd29424e5e922f6d2b8a5520da8e0d783dc1d6` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; original alpha levels 110..240); crop ROI [0, 0, 2162, 3844], alpha bounding box [288, 532, 1910, 3630], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `b344b8e610d56bbf384fff41813fcc133774854376da0a76560ef4ca47e32363`, mask sha256 `e7e9695c49334f8824de3ed665e74410ad5fbf0c148ed38033f69cbf6be3308b`.

## Catalogue identity

- **Record:** catalogue id 211, Lab "Westlake Robotics", Robot "Westlake o1".
- The TITAN O1 render referenced by Westlake Robotics' O1 page (native 2162 × 3844, with its own transparency): the whole robot in a running pose with head, both hands and both feet. The translucent motion trail beside it, all below alpha 96 in the original, is dropped by levelling that alpha (110..240); RGB unchanged.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 14, PR not yet merged)

- **PNG:** `assets/robots/westlake-titan-o1/westlake-titan-o1-full-body.png`, 1662 × 3138 px, sha256 `b344b8e610d56bbf384fff41813fcc133774854376da0a76560ef4ca47e32363` (= the prepared.png).
- **WebP:** `assets/robots/westlake-titan-o1/westlake-titan-o1-full-body.webp`, sha256 `a9477bcb5832ce80aff49d403b45e362b71a45dae24ababc4f2c2129962d5390`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
