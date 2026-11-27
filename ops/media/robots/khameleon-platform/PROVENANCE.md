# Not disclosed (Khameleon): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 18, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Khameleon's. No open licence is presumed. The site credits it as "Image: Khameleon, platform in task configuration with tools and bottle, manufacturer photograph".
- **Page:** https://www.khameleonrobotics.com/
- **File:** https://www.khameleonrobotics.com/media/trash.jpg
- **Context (Codex):** Official maker homepage identifies Khameleon multifunctional dual-arm commercial platform, although catalogue does not yet disclose a model name. Native 1200x900 image shows complete top sensor pillar, both arms, actual end effectors, whole mobile base and all visible wheels. Approximate ROI x150..670 y5..820. Keep actual attached tools, central docked mop and cables. Left gripper holds small clear bottle: preserve held bottle as photographed rather than reconstruct fingers; caption must identify task configuration with tools/bottle. Bottle does not hide torso/base. External round table begins below bottle with visible gap, do not include table or right external bin. Compare thin cables against original carefully. No human head/legs by design; no new anatomy. If mask cannot preserve complete hardware reject and investigate hero.mp4 for clean whole stance. Merely lacking model name is not grounds for exception when actual platform is identified. Do not change master/name/specs.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 5083e8a (candidates-48), 2021f8c (candidates-49) and 6f9b29e (candidates-51)); kept in `ops/media/intake-remaining-2026-11-27/batch-18/khameleon-manufacturer-complete-platform/`.
- **Original:** `original.jpg`, 1200 × 900 px, RGB, 105,582 bytes, sha256 `bda9159775d1fdc4b648578685f1897f4c14fd578f0cf501df884a3a5d2d9ecb` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240; the round side table and the bin on the right are out; the clear bottle held in the left gripper is kept. A dark slot under the right dispenser of the base (x 375..395, y 590..640 of the original) stays opaque as the mask left it: it has the colour of the robot's black parts and there is no clear evidence that it is background); crop ROI [140, 0, 680, 820], alpha bounding box [22, 12, 519, 805], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `dfd55e82473fdc2f95ec8e9fb2d7c65e1161c6a7c869b3dea72a834e3ec8a913`, mask sha256 `cbc326db1ff82ea16082876413f6bd3052235e7f32416e553e7cb581955774f1`.

## Catalogue identity

- **Record:** catalogue id 109, Lab "Khameleon", Robot "Not disclosed".
- A photograph on Khameleon's site (native 1200 × 900): the whole platform with its mast, both arms and grippers, the tools, dock, mop and cables, and the complete wheeled base; it holds a clear bottle in the left gripper, which is kept. The round side table, the bin and the room are excluded by the alpha mask. The maker does not disclose a model name, and none is given here.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 18, PR not yet merged)

- **PNG:** `assets/robots/khameleon-platform/khameleon-platform-full-body.png`, 537 × 833 px, sha256 `dfd55e82473fdc2f95ec8e9fb2d7c65e1161c6a7c869b3dea72a834e3ec8a913` (= the prepared.png).
- **WebP:** `assets/robots/khameleon-platform/khameleon-platform-full-body.webp`, sha256 `c9836d3651fd941ef67dfec6e33e81cdef077372925763cc9b7d0cf521e0f0e6`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
