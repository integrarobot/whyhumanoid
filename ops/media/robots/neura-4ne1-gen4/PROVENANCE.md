# 4NE1 (Gen 4 announced) (Neura): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** NEURA Robotics's. No open licence is presumed. The site credits it as "Image: NEURA Robotics, 4NE1 Gen 4 reveal, manufacturer video still (October 2026)".
- **Page:** https://www.youtube.com/watch?v=_76mR2pA0mA
- **File:** https://www.youtube.com/watch?v=_76mR2pA0mA
- **Context (Codex):** Select ONLY the whole left foreground robot in side/three-quarter pose, approximate original ROI x310..530 y110..1020. Native head, both actual hands and both feet are complete, without person or ribbon crossing the body. The front right robot has head/feet clipped and MUST NOT be used; center distant robot has ribbon crossing and is rejected. Keep native black textile, blue head light and white cuff. Remove camera operator, stage truss, other robots, ribbon, floor and shadow by alpha only. No brighter RGB or invented front pose. Mandatory caption manufacturer video still, 4NE1 Gen4 reveal, October 2026. This is the new textile Gen4, not older chrome Gen3.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41) and 1c2c9a0 (candidates-42)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/neura-4ne1-gen4-native-video/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 1,743,305 bytes, sha256 `0c525e68c876d16db2dfb3cf0e0ce3c88d838485828013a28e13a5669b7782f1` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240); crop ROI [290, 100, 560, 1040], alpha bounding box [53, 24, 227, 909], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `eef64a0547d69376bcaf65080ee840880b9dbaa9ec995fced8aedd50ba9515f9`, mask sha256 `3753bd3122944cacaf680ddea70494bd89036188fa78d9b15e79160fe21e38dd`.

## Catalogue identity

- **Record:** catalogue id 58, Lab "Neura", Robot "4NE1 (Gen 4 announced)".
- Frame 542 (21.68 s) of NEURA Robotics' 4NE1 Gen 4 reveal video, at its native 1920 × 1080: the whole left foreground robot in its black textile cover, with head and blue light, the near hand with its white cuff and both feet. The camera operator, the stage truss, the other robots, the ribbon and the floor are excluded by the alpha mask. It shows Gen 4, not the chrome Gen 3; the record's page mixes generations and Gen 4 is the one chosen (Codex).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 16, PR not yet merged)

- **PNG:** `assets/robots/neura-4ne1-gen4/neura-4ne1-gen4-full-body.png`, 214 × 925 px, sha256 `eef64a0547d69376bcaf65080ee840880b9dbaa9ec995fced8aedd50ba9515f9` (= the prepared.png).
- **WebP:** `assets/robots/neura-4ne1-gen4/neura-4ne1-gen4-full-body.webp`, sha256 `3500e073399b979dfbc0a542c820a6f3f3d9c2b582ed2197f4063c0bdc046ce6`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
