# Not disclosed (Noble Machines): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** NobleMachines's. No open licence is presumed. The site credits it as "Image: Noble Machines, unnamed platform".
- **Page:** https://www.noblemachines.ai/
- **File:** https://www.noblemachines.ai/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fwg3g1rbz%2Fproduction%2F0ca8a6a5eb8003f5da1f2dd5160556135aec7443-1526x1552.jpg&w=3840&q=75
- **Context (Codex):** Catalogue record107 explicitly says Noble Machines platform; product name unconfirmed. Official manufacturer warehouse photo1526x1552 shows the whole actual bent-knee biped, two feet, arms and upper sensor/motor assembly carrying a translucent tote. Keep cargo and all robot parts; no invented human head or name such as Moby. Caption unnamed NobleMachines platform. Source optical appearance through tote is preserved; no RGB/background decontamination. Independently inspect cargo/foreground matting and actual whole figure.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/noble-machines-platform/`.
- **Original:** `original.jpg`, 1526 × 1552 px, RGB, 230,886 bytes, sha256 `a6f35d3c5c166f3c082de296add01c52fd3ecd44fdf39d8ec3728dfeaba865ef` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [350, 100, 1450, 1500], alpha bounding box [90, 250, 1022, 1345], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `8b3dccdf73f2026537a6d4068dba2ac48bf34a40c158b9fc5b1e1191c905abe4`, mask sha256 `621a155869a74c93e7cedcf27dccbd7c0b1d921d0d7458e5df1bc1fb1fc6770f`.

## Catalogue identity

- **Record:** catalogue id 107, Lab "Noble Machines", Robot "Not disclosed".
- Noble Machines' official warehouse photograph: the whole bent-knee biped with both feet, arms and its upper sensor and motor assembly, carrying a translucent tote. The record names no product and none is given here. Seen through the translucent tote, the robot and the warehouse keep the colours they have in the photograph: nothing behind the tote is removed or repainted.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 12, PR not yet merged)

- **PNG:** `assets/robots/noble-machines-platform/noble-machines-platform-full-body.png`, 972 × 1135 px, sha256 `8b3dccdf73f2026537a6d4068dba2ac48bf34a40c158b9fc5b1e1191c905abe4` (= the prepared.png).
- **WebP:** `assets/robots/noble-machines-platform/noble-machines-platform-full-body.webp`, sha256 `9a16c0134bb4685a897d959eaf0636071a5a54b23c90d329b59bfa8f6e562f48`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
