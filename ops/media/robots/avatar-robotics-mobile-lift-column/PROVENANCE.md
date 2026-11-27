# Avatar humanoid (model name not disclosed) (Avatar Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Avatar Robotics's. No open licence is presumed. The site credits it as "Image: Avatar Robotics, mobile lift-column configuration, official video still".
- **Page:** https://www.avatarrobotics.com/
- **File:** https://framerusercontent.com/assets/ufET1Ro5uqxXNvjaYYsMJUotv7k.webm
- **Context (Codex):** Exact maker homepage video native1920x1080, frame755 at31.4896s /23.976fps. Complete mobile humanoid side profile, black/white head, both actual arms/grippers (self-overlapping in pose but all actual tips visible before rackpost), tray with silver packets, whole rear lift column, complete mobilebase including central side wheel. Root inspected native. Right rack post beyond hand, does not obscure robot; no invented fingers/feet. Caption Avatar Robotics, mobile lift-column configuration, official video still. Preserve tray/contents as platform, exclude racks/floor. Inspect thin black robot cables accurately, no background pieces or reconstructed parts. Suggested safeROI[820,280,1345,1040], independently widen as needed. Other front frame830 external rack occludes leftarm and is rejected; frame755 specifically selected.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27) and 62f03ab (candidates-28)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/avatar-mobile-profile/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 1,629,697 bytes, sha256 `d77fa6b385baa49786e6b3e554e876755864971e2e6f0fcd7200115dfc0cc570` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [820, 280, 1345, 1040], alpha bounding box [48, 48, 499, 727], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `2a3dfffb71091eeedbca87ebab67bf2ad3829af36e52194cca1e8254646638d1`, mask sha256 `c9cf36fc6fb7aaedb89f4513d9c7ff7007baf47b832f220d0a08641c3d0ac6dc`.

## Catalogue identity

- **Record:** catalogue id 166, Lab "Avatar Robotics", Robot "Avatar humanoid (model name not disclosed)".
- Frame 755 (31.49 s) of the video on Avatar Robotics' homepage, decoded at its native 1920 × 1080: the whole platform in side view, with the black and white head, both arms and grippers, the tray with its packets, the rear lift column and the complete wheeled base. The shelving rack and the floor are excluded by the alpha mask; the tray and its contents are kept as part of the platform. The maker does not disclose a model name, and none is given here.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 15, PR 249, merge 672539d, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/avatar-robotics-mobile-lift-column/avatar-robotics-mobile-lift-column-full-body.png`, 491 × 719 px, sha256 `2a3dfffb71091eeedbca87ebab67bf2ad3829af36e52194cca1e8254646638d1` (= the prepared.png).
- **WebP:** `assets/robots/avatar-robotics-mobile-lift-column/avatar-robotics-mobile-lift-column-full-body.webp`, sha256 `dd8e6a269094a880ac78e0e00a12a04146e8c7d7e47563514767c59ae86af81d`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
