# Onero H1 (Switch): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** SwitchBot's. No open licence is presumed. The site credits it as "Image: SwitchBot".
- **Page:** https://eu.switch-bot.com/
- **File:** https://cdn.shopify.com/s/files/1/0610/2843/4085/files/H1_1x_1.png?v=1767594175
- **Context (Codex):** Official SwitchBot homepage onero H1 card, exact alt onero H1. Full wheeled robot including whole base. Native figure, not the separate robotic arm or fan.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/switchbot-onero-h1/`.
- **Original:** `original.png`, 871 × 870 px, RGBA, 128,579 bytes, sha256 `2ae42be7dd5af04ad25eb67eea0fd990b79aca960e8273d2c75031581e763df5` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad); crop ROI [0, 0, 871, 870], alpha bounding box [240, 117, 550, 767], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `9767b1cf3de23deaf4a18ed528414692eef1d05f893fab6273cecfe62a3ff3dd`, mask sha256 `60e9651c27708a9e24a72ee59c5f4c49a201472a8c11ef25d92c4d6541c88e0e`.

## Catalogue identity

- **Record:** catalogue id 84, Lab "Switch", Robot "Onero H1".
- SwitchBot's homepage card for onero H1, image alt "onero H1"; the whole wheeled robot with its base, not the separate arm or fan products. The record is Onero H1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

- **Quality:** Small source: 350 × 690 px as prepared.

## Published files (image batch 9, PR 230, merge 98b6aa5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/switchbot-onero-h1/switchbot-onero-h1-full-body.png`, 350 × 690 px, sha256 `9767b1cf3de23deaf4a18ed528414692eef1d05f893fab6273cecfe62a3ff3dd` (= the prepared.png).
- **WebP:** `assets/robots/switchbot-onero-h1/switchbot-onero-h1-full-body.webp`, sha256 `1a523ed7699b126fd05882911214e22d10f95887a3db68aaaa393eb4c65c7680`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
