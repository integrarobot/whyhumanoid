# Vibe 01 (Vibe Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** VibeRobotics's. No open licence is presumed. The site credits it as "Image: Vibe Robotics, Vibe 01 render".
- **Page:** https://www.viberobotics.co/
- **File:** https://www.viberobotics.co/media/room1501-first.webp
- **Context (Codex):** Official homepage video poster room1501-first.webp720x900. Publisher aria-label explicitly says Rendered,2am: Vibe01 carries a bag down a hotel corridor and hangs it on a room door handle. Whole front unit including BOTH caster-wheel extremities, lower floor margin visible; preserve both held bags. Unlike cropped og.jpg previously rejected. Label concept/manufacturer render, no hardware demonstration claim.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/vibe-01/`.
- **Original:** `original.webp`, 720 × 900 px, RGB, 20,826 bytes, sha256 `07b5bfaba10d56e1b14fc5905786e27626821e0524bd90063235c21219f727cc` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [0, 0, 720, 900], alpha bounding box [133, 131, 557, 877], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `0693919659c292a0bdf3474bfc64ae6922604ac4a6ff2f507f45116fc285914e`, mask sha256 `5878b312f206885d9621f8200815851a2def93519ff25149dedc40ad85aa010f`.

## Catalogue identity

- **Record:** catalogue id 118, Lab "Vibe Robotics", Robot "Vibe 01".
- The poster of Vibe Robotics' homepage video, which the publisher labels as rendered (Vibe 01 carrying a bag down a hotel corridor): the whole unit with both caster-wheel ends and the bags it holds. It is a manufacturer render, not a hardware demonstration.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 12, PR not yet merged)

- **PNG:** `assets/robots/vibe-robotics-vibe-01/vibe-robotics-vibe-01-full-body.png`, 464 × 786 px, sha256 `0693919659c292a0bdf3474bfc64ae6922604ac4a6ff2f507f45116fc285914e` (= the prepared.png).
- **WebP:** `assets/robots/vibe-robotics-vibe-01/vibe-robotics-vibe-01-full-body.webp`, sha256 `3f33823955a240426cf95b3519fe9de728d392e2a9385d197218e174393c2154`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
