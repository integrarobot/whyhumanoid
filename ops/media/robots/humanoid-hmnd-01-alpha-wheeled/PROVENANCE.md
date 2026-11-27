# HMND 01 (Alpha Wheeled / Bipedal) (The Humanoid): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Humanoid's. No open licence is presumed. The site credits it as "Image: Humanoid, HMND 01 Alpha Wheeled".
- **Page:** https://thehumanoid.ai/
- **File:** https://thehumanoid.ai/wp-content/themes/SKLTech/src/assets/images/redisign/reliability-robot.png
- **Context (Codex):** Humanoid homepage reliability-robot.png full wheeled platform. Catalogue explicitly allows Alpha Wheeled and Alpha Bipedal, not interchangeable; this depicts the wheeled configuration, which alt/provenance must name. Independently check identification against source page.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/humanoid-hmnd-01-alpha-wheeled/`.
- **Original:** `original.png`, 1420 × 2584 px, P, 926,797 bytes, sha256 `9134211d4229ef124eebdf08150a7749824df92cb6e0689377b17bdc8a765288` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad); crop ROI [0, 0, 1420, 2584], alpha bounding box [35, 39, 1348, 2536], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `48d235dfe14870c60d783def6d71c4b4d181543500f4f2ae53a0826f276ebf9e`, mask sha256 `9a634b9547932bc95404176b6957ffc6eb1766a83a13fdf877799a8e2bea3704`.

## Catalogue identity

- **Record:** catalogue id 88, Lab "The Humanoid", Robot "HMND 01 (Alpha Wheeled / Bipedal)".
- Humanoid's homepage image reliability-robot.png shows the wheeled HMND 01. The record covers HMND 01 as two platforms, Alpha Wheeled and Alpha Bipedal, which are not interchangeable; the image is the Alpha Wheeled one and the caption names it. Old specifications in the record have no resolved version and are not attributed to this platform.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 9, PR 230, merge 98b6aa5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/humanoid-hmnd-01-alpha-wheeled/humanoid-hmnd-01-alpha-wheeled-full-body.png`, 1353 × 2537 px, sha256 `48d235dfe14870c60d783def6d71c4b4d181543500f4f2ae53a0826f276ebf9e` (= the prepared.png).
- **WebP:** `assets/robots/humanoid-hmnd-01-alpha-wheeled/humanoid-hmnd-01-alpha-wheeled-full-body.webp`, sha256 `80ceacfbbbcbf7d51d3a231b9af8a71bfde4ad341d703f7d8c3e05c00c140686`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
