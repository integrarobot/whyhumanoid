# Dex (Richtech Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** RichtechRobotics's. No open licence is presumed. The site credits it as "Image: Richtech Robotics, DEX-M".
- **Page:** https://www.richtechrobotics.com/solutions/dex
- **File:** https://www.richtechrobotics.com/hubfs/richtech/renders/dex-trimmed-4.png
- **Context (Codex):** Official DEX product page dex-trimmed-4.png corresponding DEX-M mobile wheeled chassis, not ADAM or fixed DEX-S. Label DEX-M configuration. Native alpha adjusted70..245 for faint floor shadow.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/richtech-dex-m/`.
- **Original:** `original.png`, 1142 × 1377 px, RGBA, 696,828 bytes, sha256 `8244f666ce45fbe992c2fbaadee2b992859c1c26e67b269d10cc13b34b2f3190` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Alpha50..235;largest connected figure;20px transparent pad;source RGB/native resolution preserved. Independent visual review required.; Quanta source replaced with unobstructed whole navigation illustration; Dex native alpha70..245 removes faint floor shadow.); crop ROI [0, 0, 1142, 1377], alpha bounding box [14, 19, 1127, 1367], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `0a497f028d6a189d92cd11d385068174b448c9e8b06e1290e493676e11a03c64`, mask sha256 `18fdb4e51fee77ee035fca8a6f94ee4e8fc3fc629e28d20e579c92f8a7aea67c`.

## Catalogue identity

- **Record:** catalogue id 197, Lab "Richtech Robotics", Robot "Dex".
- Official DEX product page render dex-trimmed-4.png, which corresponds to DEX-M on the mobile wheeled chassis, not ADAM or the fixed DEX-S. The record is Dex (mobile chassis); the caption names DEX-M.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 10, PR 232, merge 4db495d, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/richtech-dex-m/richtech-dex-m-full-body.png`, 1153 × 1388 px, sha256 `0a497f028d6a189d92cd11d385068174b448c9e8b06e1290e493676e11a03c64` (= the prepared.png).
- **WebP:** `assets/robots/richtech-dex-m/richtech-dex-m-full-body.webp`, sha256 `206e43a536287025d58cd3f9277c68f7a41aea074eff6ab02c0b3363aad051d1`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
