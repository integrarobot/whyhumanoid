# NORI A3 (Nori): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** NoriRobotics's. No open licence is presumed. The site credits it as "Image: Nori Robotics".
- **Page:** https://www.norirobotics.com/
- **File:** https://www.norirobotics.com/images/hero-still.44381e82.png
- **Context (Codex):** Official homepage hero-still.44381e82.png, full wheeled NORI robot, both manipulators, head, column and entire caster base. Not torso-only preview. Verify same named family; no claim of production maturity.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/nori/`.
- **Original:** `original.png`, 1600 × 1340 px, RGB, 1,866,845 bytes, sha256 `5885cdfa4060ba65cea04099a36cdba8527c87e82db5d9707b15ef91c0987cb5` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [0, 0, 1600, 1340], alpha bounding box [644, 205, 1022, 1242], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `1def96b91a30d86c980fcf658ac3e3ff69b47be4b2ebfd3e88768caf28909aea`, mask sha256 `1b2901bdb82116629d5d8d363a0d08fd78caba66899f7bd874c94ed9c1ec695b`.

## Catalogue identity

- **Record:** catalogue id 119, Lab "Nori", Robot "NORI A3".
- Nori Robotics' official homepage hero still: the whole wheeled NORI robot with both manipulators, head, column and caster base, not the torso-only preview. The record is NORI A3 (website announcement and sales offer); no production maturity is implied.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 11, PR not yet merged)

- **PNG:** `assets/robots/nori/nori-full-body.png`, 418 × 1077 px, sha256 `1def96b91a30d86c980fcf658ac3e3ff69b47be4b2ebfd3e88768caf28909aea` (= the prepared.png).
- **WebP:** `assets/robots/nori/nori-full-body.webp`, sha256 `46a7648027443a10bc03fd5fa6ab105adb9ecc44cfbbd23e032df72c8e3ed797`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
