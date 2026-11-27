# Phoenix (Sanctuary AI): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Sanctuary AI's. No open licence is presumed. The site credits it as "Image: Sanctuary AI, Phoenix Gen 6 launch graphic (2023)".
- **Page:** https://sanctuary.ai/news/sanctuary-ai-unveils-phoenix-a-humanoid-general-purpose-robot-designed-for-work/
- **File:** https://sanctuary.ai/wp-content/uploads/2023/05/main-image-phoenix-annoucement-1.webp
- **Context (Codex):** Official Phoenix launch graphic explicitly Gen6, native1180x680 with whole robot head, both hands and feet at right; robot nativeheight~580. Callout lines and text are outside body (unlike rejected VB1/Tianyi) so may be excluded by alpha; inspect carefully no painted body marks. Isolate only robot, exclude black background, all text/orangeframe and floor glow. Preserve exact black body pixels, no brightening/reconstruction. Caption Phoenix Gen6 manufacturer launch graphic, historical2023configuration on Phoenix family record; do not label Gen7 or current hardware/spec proof. FigureapproxROI[660,30,890,650], independently check all extremities.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/sanctuary-phoenix-gen6/`.
- **Original:** `original.webp`, 1160 × 680 px, RGB, 44,034 bytes, sha256 `400ff83a111118944cffff74d6d5b0efc857027604d0b0d137f21831d10fc44e` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [640, 20, 910, 670], alpha bounding box [46, 31, 240, 615], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `1bb108ac5f55d9415b60e5ea3c7f0e1e58099fa81da10b187fddf205e09420e5`, mask sha256 `38d5f2ccafec899cb1c95d9eaf355b4d75700e7f570d466033d7248ccf1941f4`.

## Catalogue identity

- **Record:** catalogue id 80, Lab "Sanctuary AI", Robot "Phoenix".
- The Phoenix Gen 6 launch graphic from Sanctuary AI (native 1160 × 680): the whole robot with head, both hands and both feet. The callout lines, text, orange frame, black background and floor glow are excluded by the alpha mask; no body pixel is brightened or reconstructed. It shows the 2023 Gen 6 configuration, not Gen 7 or current hardware.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 14, PR 246, merge 6fecfb5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/sanctuary-phoenix-gen6/sanctuary-phoenix-gen6-full-body.png`, 234 × 624 px, sha256 `1bb108ac5f55d9415b60e5ea3c7f0e1e58099fa81da10b187fddf205e09420e5` (= the prepared.png).
- **WebP:** `assets/robots/sanctuary-phoenix-gen6/sanctuary-phoenix-gen6-full-body.webp`, sha256 `54bc416a79af6a2dbd1fdca844cc28e42207d83d2e8f7f86d8eb4b26085d4a02`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
