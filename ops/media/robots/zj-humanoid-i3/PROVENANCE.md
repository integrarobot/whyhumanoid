# NAVIAI i3 (ZJ Humanoid): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** ZJ Humanoid / NAVIAI's. No open licence is presumed. The site credits it as "Image: ZJ Humanoid, i3 official product video still, walking configuration (2026)".
- **Page:** https://www.zj-humanoid.com/zujian/2
- **File:** https://www.zj-humanoid.com/uploads/upload/video/20260715/26bfc3d74321a2f63f7fcdbfb52c0865.mp4
- **Context (Codex):** Exact i3 official product page, feature video labelled 威猛身躯 刚柔并济. Native1920x1080, frame57 after dissolve has ended, whole single robot three-quarter walking pose. Native head and both feet whole; forefoot lowermost pixel aroundy1067 leaves13px original margin. Keep original hands/dexterous fingers and self-occlusion of far hand by thigh. Actual waist/leg black cables and loops must remain; remove sky, buildings, trees, ground, shadow via alpha only. ApproxROI x630..1090 y40..1080, independently widen to full figure, no rescale or RGB changes. Mandatory credit i3 official product video still, walking configuration,2026. Do not use earlierframe44 because foot is clipped at bottom, or dissolveframe31 with ghost body. Do not archive source HTML, which contains unrelated exposed debug configuration; this package contains public image provenance only. No model specs/capability claims changed.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41) and 1c2c9a0 (candidates-42)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/zj-humanoid-i3-native-video/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 2,349,679 bytes, sha256 `a060626d9695047263f4b8ce4eedc438b72305ffa0058387146b691d64b08136` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240); crop ROI [620, 40, 1110, 1080], alpha bounding box [44, 23, 438, 1027], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `7b3ae22038ee06556eeefffb711367e00fded807a8ecced127d8c43cc8c6b554`, mask sha256 `4a32f846c0dc7a432dbf08f9a685b5249a2ee0dcdb2ae43559bd9101b459971d`.

## Catalogue identity

- **Record:** catalogue id 209, Lab "ZJ Humanoid", Robot "NAVIAI i3".
- Frame 57 (1.9 s) of the video on ZJ Humanoid's i3 page, at its native 1920 × 1080: the whole robot walking, with head, both hands (the far one partly behind the thigh, as filmed), the waist and leg cables and both feet. The sky, the buildings, the trees, the road and the shadow are excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 16, PR 251, merge 43d8984, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/zj-humanoid-i3/zj-humanoid-i3-full-body.png`, 434 × 1044 px, sha256 `7b3ae22038ee06556eeefffb711367e00fded807a8ecced127d8c43cc8c6b554` (= the prepared.png).
- **WebP:** `assets/robots/zj-humanoid-i3/zj-humanoid-i3-full-body.webp`, sha256 `35563cb547b8b223f816a062128027c10b2abab7bceb099ce8dc3c692368707f`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
