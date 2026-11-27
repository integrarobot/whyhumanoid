# TM Xplore I (Techman Robot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 18, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Techman Robot / SSI's. No open licence is presumed. The site credits it as "Image: Techman Robot, TM Xplore I product animation still (2025), via SSI".
- **Page:** https://ssi-robot.co.jp/次世代ヒューマノイド「tm-xplore-i」動画公開/
- **File:** https://www.youtube.com/watch?v=b9-bPE_NKcI
- **Context (Codex):** SSI CO.,LTD official distributor primary post dated2025-09-02 explicitly introduces Techman Robot TM Xplore I and embeds this product video. Native1920x1080 frame315,10.5105s at30000/1001fps: title overlay has fully disappeared and camera approaches exact complete robot. This is an EXISTING PRODUCT ANIMATION, not newly generated render or physical photograph. Caption Techman Robot, TM Xplore I product animation still (2025), via SSI. ApproximateROI x800..1130 y125..900; head, both articulated fingers/hands, actual mast/knee mechanism and entire wheelbase complete. Both black hand shapes must be preserved against dark green background; top/side head is glossy black real product render, not transparency. Remove background/floor/shadow/reflection only with alpha, no colour brighten/upscaling/rendering. Earlier frame266 has text ON hands and is not selected; frame315 is clean and native robot about750px high. Do not relabel as 2026 hardware/photo or assert version specs based on animation.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 5083e8a (candidates-48), 2021f8c (candidates-49) and 6f9b29e (candidates-51)); kept in `ops/media/intake-remaining-2026-11-27/batch-18/techman-tm-xplore-i-2025-product-animation/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 722,194 bytes, sha256 `7b74380e12f6bb2a1149b6d97757cd686426c67b42482e6982c5b6a79fb87bc8` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240; the black hands and head are kept against the dark green background; the fingers were checked at native scale); crop ROI [780, 105, 1150, 920], alpha bounding box [33, 33, 337, 781], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `f11af6fd4c89273fd7396f5da04ed23a6982f3b5f6821579331ce15c6d56f0a6`, mask sha256 `af048c360718316d4e7169e1b1ffaefda17cd5b5e4f1088dfe5dd78b57fa42e0`.

## Catalogue identity

- **Record:** catalogue id 214, Lab "Techman Robot", Robot "TM Xplore I".
- Frame 315 (10.51 s) of the TM Xplore I product animation published by SSI on 2 September 2025, at its native 1920 × 1080, after the on-screen text has gone: the whole robot with head, both hands and the base. It is an animation, not a photograph of 2026 hardware. The dark green studio and the floor are excluded by the alpha mask; the black hands and head are kept.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 18, PR not yet merged)

- **PNG:** `assets/robots/techman-tm-xplore-i/techman-tm-xplore-i-full-body.png`, 344 × 788 px, sha256 `f11af6fd4c89273fd7396f5da04ed23a6982f3b5f6821579331ce15c6d56f0a6` (= the prepared.png).
- **WebP:** `assets/robots/techman-tm-xplore-i/techman-tm-xplore-i-full-body.webp`, sha256 `61d3460d8202d172f91e35ad0de6271f199920e933d8572b74be2b412307c061`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
