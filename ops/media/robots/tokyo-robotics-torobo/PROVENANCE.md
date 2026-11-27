# Torobo (Tokyo): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** TokyoRobotics's. No open licence is presumed. The site credits it as "Image: Tokyo Robotics".
- **Page:** https://robotics.tokyo/
- **File:** https://robotics.tokyo/_astro/torobo_move_task.B568ZBLp_sttoz.webp
- **Context (Codex):** Official Torobo page, full wheeled platform carrying sacks; preserve payload and grippers. Visible exact Torobo name on page.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/tokyo-robotics-torobo/`.
- **Original:** `original.webp`, 2470 × 1380 px, RGB, 65,266 bytes, sha256 `d0ad1ba39f38ec08ec558ca94e347154249e10b13cf27ec38576cb41828a0617` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Alpha50..235;largest connected figure;20px transparent pad;source RGB/native resolution preserved. Independent visual review required.); crop ROI [350, 100, 1250, 1380], alpha bounding box [121, 142, 713, 1234], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `6be643d84fd046dd45f6bbaee6a75bfd3789cc975d961584d889610cd5074a85`, mask sha256 `98d9523a7966cc945d43fa5993b16cf74e824a1488b10d103338c15bf7264d81`.

## Catalogue identity

- **Record:** catalogue id 90, Lab "Tokyo", Robot "Torobo".
- Tokyo Robotics' official page image torobo_move_task, with the Torobo name on the page: the whole platform carrying sacks, with its payload and grippers. The record is Torobo (mobile-manipulator configuration in the product brochure).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 10, PR not yet merged)

- **PNG:** `assets/robots/tokyo-robotics-torobo/tokyo-robotics-torobo-full-body.png`, 632 × 1132 px, sha256 `6be643d84fd046dd45f6bbaee6a75bfd3789cc975d961584d889610cd5074a85` (= the prepared.png).
- **WebP:** `assets/robots/tokyo-robotics-torobo/tokyo-robotics-torobo-full-body.webp`, sha256 `659579c77df8e3f711d45fd25fa727bee249e49a0e814abedad7023fc7d326c8`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
