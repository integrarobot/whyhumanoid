# MagicBot Z1 (Magiclab): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** MagicLab's. No open licence is presumed. The site credits it as "Image: MagicLab, MagicBot Z1 video still, round-ended-arm configuration".
- **Page:** https://www.magiclab.top/en/z1
- **File:** https://oss-cdn.magiclab.top/file/videos/z1/ff1ce7/ecb2981116c2b3c8ece77f6df4347d61.mp4
- **Context (Codex):** Exact Z1 maker page references this video; native1920x1080 frame153 at6.12s/25fps (178totalframes). Whole head, both actual rounded arm end caps, both feet in a walking pose, nativebodyheight~525px. No added human hands/fingers: this configuration has rounded closed end caps. Choose153 because balls separated from feet unlike59; exclude allballs, grass/floor, tree/city. ApproxROI[480,320,870,930] independently ensure wholebody/margins. Caption MagicBot Z1 official video still, round-ended-arm configuration. Existinghardwarefootage, no generative edits, no claim balancing/autonomy evidence. Page/staticimgs404, officialvideoaccessworks. This is NOT Gen1 video used for record54.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/magiclab-z1-video/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 1,224,204 bytes, sha256 `58b3c044b4b2407b7cee4ecc387fd11e3e41461b3272063dfd147a98d29cc236` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [440, 280, 910, 960], alpha bounding box [74, 79, 405, 601], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `bc85e0ff4cefeff2866f855616bfec616c9f9f68382488266a3f57cdc70ed8f9`, mask sha256 `fda79f2486152d7745f1bbfc7e73bd733e883d6ddcdf17cde2c5f3653b0dc744`.

## Catalogue identity

- **Record:** catalogue id 160, Lab "Magiclab", Robot "MagicBot Z1".
- Frame 153 (6.12 s) of the video on MagicLab's MagicBot Z1 page (native 1920 × 1080): the whole robot with head, both arms ending in their rounded end caps (no hands are added) and both feet in a walking pose. The balls, the grass and the background are excluded by the alpha mask. Not the Gen1 video used for record 54.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 14, PR 246, merge 6fecfb5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/magiclab-magicbot-z1/magiclab-magicbot-z1-full-body.png`, 371 × 562 px, sha256 `bc85e0ff4cefeff2866f855616bfec616c9f9f68382488266a3f57cdc70ed8f9` (= the prepared.png).
- **WebP:** `assets/robots/magiclab-magicbot-z1/magiclab-magicbot-z1-full-body.webp`, sha256 `0ef45cae6677dc5249c55eae2319c29164ce103fd9d44b670ab405d731d26158`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
