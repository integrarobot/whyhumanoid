# Taskbot (Revobots): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** REVOBOTS's. No open licence is presumed. The site credits it as "Image: REVOBOTS, TASKBOT SCOUT mobile configuration, official video still".
- **Page:** https://revobots.ai/
- **File:** https://revobots.ai/_assets/video/9cde64a553bd519ee408b99fd8340690.mp4
- **Context (Codex):** Official homepage embedded Canva video VAG4Ru9-e18. Native1920x1080 encoded rendition explicitly referenced in dashVideoFiles metadata. This is NOT a newly upscaled1280 frame; source media directly fetched1080 (same628frames30fps). Frame292 at9.7333s; whole sensor mast/cap and complete four-wheeledmobileplatform, margin below tyres. No arms/head invented, this SCOUT configuration has sensor mast by design. Crucially current record74 Platform and mobility explicitly includes TASKBOT SCOUT autonomous mobile robot (patrol, inspection), so exact configuration matches owning catalogue. Homepage labels same configuration TASKBOT SCOUT. Caption REVOBOTS, TASKBOT SCOUT mobile configuration, official video still; do not silently label it humanoid hardware or payload evidence. Alpha-only, exclude street/car/logos, preserve RGB/native20padding. Root inspected native1080 frame292, all physical platform whole. ApproxROI[1020,340,1490,1080], independently widen enough toretainwholewheels.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27) and 62f03ab (candidates-28)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/revobots-taskbot-scout/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 1,743,299 bytes, sha256 `bdc96b561581682c97d6ff694f1b50fa55d559a0d35b52b0fa36d5c4e08174e2` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240; levels 150..240 instead of the usual 85..230 so the soft video edge of the white tyres does not carry a dark rim of asphalt); crop ROI [1000, 330, 1510, 1080], alpha bounding box [47, 72, 455, 743], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `109bd22d0f96b7c53380e7fbcbf6dba8c4dd55235c89d05989b7749d5ba1cffc`, mask sha256 `5ba3580eed580c68dcd0303ca2187ed5eb3a6b0071f1e99690eee986075badaa`.

## Catalogue identity

- **Record:** catalogue id 74, Lab "Revobots", Robot "Taskbot".
- Frame 292 (9.73 s) of the video on REVOBOTS' homepage, at its native 1920 × 1080 encoding: the TASKBOT SCOUT configuration, whole, with its sensor mast and dome and the complete four-wheeled base. This configuration has no arms or head, and none are added; it is the mobile platform the record lists, not humanoid hardware. The street, the car and the logos are excluded by the alpha mask; the dome is transparent, so what shows through it is the scene behind, as filmed.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 15, PR 249, merge 672539d, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/revobots-taskbot-scout/revobots-taskbot-scout-full-body.png`, 448 × 711 px, sha256 `109bd22d0f96b7c53380e7fbcbf6dba8c4dd55235c89d05989b7749d5ba1cffc` (= the prepared.png).
- **WebP:** `assets/robots/revobots-taskbot-scout/revobots-taskbot-scout-full-body.webp`, sha256 `b78d5de0947228c381aa125bad29b36fd57c2e41ce2fff75db86d25ad2061b7b`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
