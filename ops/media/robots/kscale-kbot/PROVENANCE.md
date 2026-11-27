# K-bot (K-Scale Labs): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** KScaleLabs's. No open licence is presumed. The site credits it as "Image: K-Scale Labs, K-Bot technical render".
- **Page:** https://github.com/kscalelabs/kbot/blob/master/assets/pics/f.webp
- **File:** https://raw.githubusercontent.com/kscalelabs/kbot/master/assets/pics/f.webp
- **Context (Codex):** Existing official technical render composite f.webp in manufacturer kbot repo. Top-left panel shows complete robot including hands and feet, ROI suggested[0,0,730,620] from native1462x1235. Use only this one full figure, exclude other panels. Label technical render, not photo. No new rendering or inferred anatomy.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/kscale-kbot/`.
- **Original:** `original.webp`, 1462 × 1235 px, RGB, 392,456 bytes, sha256 `b05e7dddc1db9cbc27153bcc9f1ff9acfdfdda8a4fe544bd3f1132a438285975` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [0, 0, 730, 620], alpha bounding box [302, 38, 490, 596], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `48271fc9b693188eb9b86de53fd7fc3d7dfd3fa6390899c48cadf317a5f8db1c`, mask sha256 `b5672af33c537b1f1d109edf45bea738f2ac9d971373c225e09d603a04b02716`.

## Catalogue identity

- **Record:** catalogue id 46, Lab "K-Scale Labs", Robot "K-bot".
- Existing official technical render (assets/pics/f.webp in K-Scale Labs' kbot repository on GitHub): only the complete robot in the top-left panel is kept, with hands and feet. It is a render, not a hardware photograph. The record is K-Bot.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 11, PR 233, merge e8e5f40, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/kscale-kbot/kscale-kbot-full-body.png`, 228 × 598 px, sha256 `48271fc9b693188eb9b86de53fd7fc3d7dfd3fa6390899c48cadf317a5f8db1c` (= the prepared.png).
- **WebP:** `assets/robots/kscale-kbot/kscale-kbot-full-body.webp`, sha256 `56e4097f892c464541af51a9415c1c49d3d8a85422fae2ef3c0424070cdd8f21`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
