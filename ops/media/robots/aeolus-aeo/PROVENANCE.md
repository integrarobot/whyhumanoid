# aeo (Aeolus): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** AeolusRobotics's. No open licence is presumed. The site credits it as "Image: Aeolus Robotics".
- **Page:** https://www.aeolusbot.com/meet-aeo
- **File:** https://www.aeolusbot.com/_next/static/media/meet-aeo.4d246794.png
- **Context (Codex):** Official meet-aeo page. Original native PNG decoded from publisher Next Image url,2000x2427. Whole named wheeled robot with two grippers and full chassis. Alpha includes faint border traces: left border has only10 nonzero pixels, none>200; left gripper opaque geometry is complete, not a crop. Inspect native alpha/interiors and source top/bottom, remove background traces with alpha only. Do not introduce other aeo generations.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/aeolus-aeo/`.
- **Original:** `original.png`, 2000 × 2427 px, RGBA, 3,234,323 bytes, sha256 `a34bd62082d9d5e255fc531224f512d5210f5d26096970f97f4ea0f2a7f7339f` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; original alpha levels 20..250; specks removed); crop ROI [0, 0, 2000, 2427], alpha bounding box [1, 1, 1980, 2426], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `efcb41f53f30c113edbb0a826cb93da56f7a91f8f76eed4e14b1fb1b9af300a3`, mask sha256 `7f8ba9d4820ff3e227547f5b55e163f73a4db4c9989795568299cdb0f0f6a591`.

## Catalogue identity

- **Record:** catalogue id 3, Lab "Aeolus", Robot "aeo".
- Aeolus Robotics' official meet-aeo page, native transparent PNG (2000 × 2427): the whole wheeled robot with both grippers and the full chassis; faint alpha traces at the border removed by levelling the original alpha. Replaces the earlier flyer candidate whose white mast could not be separated from the white wall. The record is aeo.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 11, PR not yet merged)

- **PNG:** `assets/robots/aeolus-aeo/aeolus-aeo-full-body.png`, 2019 × 2465 px, sha256 `efcb41f53f30c113edbb0a826cb93da56f7a91f8f76eed4e14b1fb1b9af300a3` (= the prepared.png).
- **WebP:** `assets/robots/aeolus-aeo/aeolus-aeo-full-body.webp`, sha256 `8181595195ad652dc3a78646450b2b116193e7057ce7dd1c15ee685cad2d64d2`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
