# K0 (Robotis): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** ROBOTIS's. No open licence is presumed. The site credits it as "Image: ROBOTIS, AI Sapiens K0, cowboy-hat configuration".
- **Page:** https://ai.robotis.com/ai_sapiens/introduction_ai_sapiens.html
- **File:** https://ai.robotis.com/ai_sapiens/k0_no_background.png
- **Context (Codex):** Official AI Sapiens introduction identifies exact source k0_no_background.png as K0. Whole biped1131x2533, actual display configuration with cowboy hat, neck support and hands; no invented head. Caption AI Sapiens K0, cowboy-hat configuration. NOT the different wheeled AI Worker/FFW. Native alpha still requires inspection.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/robotis-k0/`.
- **Original:** `original.png`, 1131 × 2533 px, RGBA, 1,406,633 bytes, sha256 `f27e259b0b06f2beb67808367cab06a14bae7983d17d7af17fc557c075eed086` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; original alpha levels 20..250; specks removed); crop ROI [0, 0, 1131, 2533], alpha bounding box [25, 16, 1105, 2504], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `9f02754a0ce8e46941c97dda63e3b338b822035629a26585a36d6c362d11e0c0`, mask sha256 `8f6ba8a8097ef5a5bc86724c851880626efb72b6836e58f47f4176a4957247dd`.

## Catalogue identity

- **Record:** catalogue id 78, Lab "Robotis", Robot "K0".
- ROBOTIS' official AI Sapiens introduction identifies this file (k0_no_background.png) as K0: the whole biped in its display configuration with a cowboy hat, neck support and hands; nothing added. Not the wheeled AI Worker (FFW). The record is K0.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 11, PR not yet merged)

- **PNG:** `assets/robots/robotis-k0/robotis-k0-full-body.png`, 1120 × 2528 px, sha256 `9f02754a0ce8e46941c97dda63e3b338b822035629a26585a36d6c362d11e0c0` (= the prepared.png).
- **WebP:** `assets/robots/robotis-k0/robotis-k0-full-body.webp`, sha256 `f2a0b410ae62accb425ee4fb1c1b891c2ac8d6ac46c127160a792b2ab00a8d40`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
