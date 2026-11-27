# Clone (Clone): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Clone Robotics's. No open licence is presumed. The site credits it as "Image: Clone Robotics".
- **Page:** https://www.clonerobotics.com/android/
- **File:** https://www.clonerobotics.com/assets/img/android/xray/muscles.png
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/clone/`.
- **Original:** `original.png`, 6144 × 3456 px, RGB, 1,729,870 bytes, sha256 `ca8704d35a315029c16b4a65cbd4578bb5820d1fe1854329c9d39877de3092bc` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (alpha levels 85 to 230; components >=80 pixels; Moxi below row1810 excluded); crop ROI [2200, 100, 3900, 3400], alpha bounding box [298, 190, 1446, 3059], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `b4666360a64ef04d7dcbf0972a62ae1ed6ebab05ec838026723ff063d38b998b`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 18, Lab "Clone", Robot "Clone".
- Clone Robotics' own full-body rendering of its musculoskeletal android on the official /android page (an anatomical render of the artificial-muscle body, not a photograph of a working robot). The record names the robot only "Clone"; no Protoclone or Clone Alpha claim is made.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 4, PR 208, merge e152f67, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/clone-robotics-clone/clone-robotics-clone-full-body.png`, 1188 × 2909 px, sha256 `b4666360a64ef04d7dcbf0972a62ae1ed6ebab05ec838026723ff063d38b998b` (= Codex's prepared.png).
- **WebP:** `assets/robots/clone-robotics-clone/clone-robotics-clone-full-body.webp`, sha256 `86e7f9eafdd3752e9027fad49e5fa968c375b9c49554db4280dd804956b51b1a`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
