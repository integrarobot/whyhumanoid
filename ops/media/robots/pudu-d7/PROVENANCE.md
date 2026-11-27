# D7 (Pudu): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** PuduRobotics's. No open licence is presumed. The site credits it as "Image: Pudu Robotics, D7 video still".
- **Page:** https://www.pudurobotics.com/it/news/917
- **File:** https://pudu-file-host.oss-cn-beijing.aliyuncs.com/official_website/PUDU%20D7%20Video_50MB_2024-09-19_16%3A53%3A24.mp4
- **Context (Codex):** Official manufacturer D7 launch video, exact filename PUDU D7 Video50MB2024-09-19, first native3840x2160 title frame explicitly says PUDU D7 and shows whole wheeled humanoid, both hands and complete base/wheels with floor margin. Existing manufacturer video still, no new rendering or proof of task autonomy. Mask ONLY left robot, exclude title/logo/stage/ring/shadow. Full frame and source URL/fps remain recorded.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/pudu-d7/`.
- **Original:** `original.png`, 3840 × 2160 px, RGB, 1,411,902 bytes, sha256 `70ad69d73f07f1ebfa5902ae05a1332d1a4838476245b6997244d0a3ed125b0f` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [750, 150, 1900, 2160], alpha bounding box [91, 242, 756, 1864], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `f1e4b17360772988efc83b1695d66bf3e416a3c31075b505bcf77e6d7299d19c`, mask sha256 `364f735e8511eddc5bd0a8469ef4fedac313c1092108c3a2b464bbab6923e996`.

## Catalogue identity

- **Record:** catalogue id 68, Lab "Pudu", Robot "D7".
- Title frame of Pudu Robotics' official D7 launch video, which names PUDU D7: the whole wheeled humanoid with both hands and the complete base and wheels. The title, logo, stage, light ring and shadow are excluded by the alpha mask. A video still, not proof of autonomy. The record is D7.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 11, PR not yet merged)

- **PNG:** `assets/robots/pudu-d7/pudu-d7-full-body.png`, 705 × 1662 px, sha256 `f1e4b17360772988efc83b1695d66bf3e416a3c31075b505bcf77e6d7299d19c` (= the prepared.png).
- **WebP:** `assets/robots/pudu-d7/pudu-d7-full-body.webp`, sha256 `3345956d325ec9e8d9d84017c9af3bd7d8bb89f393931a5fcf5be00136174008`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
