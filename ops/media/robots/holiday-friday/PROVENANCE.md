# Friday (Holiday): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Holiday Robotics's. No open licence is presumed. The site credits it as "Image: Holiday Robotics".
- **Page:** https://holiday-robotics.com/
- **File:** https://public.hday.io/site/robots/friday.webp
- **Context (Codex):** FRIDAY Robot image explicitly identified in official shipped JavaScript (index-kqjpRqLU.js); whole wheeled platform. Remove studio background/floor through alpha only.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 299a0d7); kept in `ops/media/intake-remaining-2026-11-27/batch-08/holiday-friday/`.
- **Original:** `original.webp`, 1334 × 2000 px, RGB, 48,850 bytes, sha256 `88499f8275996964efe1f05ae4c9dcd8cfc28e5254ee1431aae2d18d4f4a47b1` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (birefnet-general mask (rembg, mask only); levels 85..230); crop ROI [0, 0, 1334, 2000], alpha bounding box [356, 180, 952, 1957], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `b3b2afe8358530b661c2d79238cfd61b72a2e21e766c6092330e97e2b6b6f3bd`, mask sha256 `84d756608b9be739a6496dc6a952acd6ab8c0074f0415f62da19f7739d7129b5`.

## Catalogue identity

- **Record:** catalogue id 41, Lab "Holiday", Robot "Friday".
- The official site's shipped JavaScript names this file (friday.webp) the FRIDAY robot image; the whole wheeled platform is shown. The catalogue record is Friday.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 8, PR 228, merge db579f7, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/holiday-friday/holiday-friday-full-body.png`, 636 × 1817 px, sha256 `b3b2afe8358530b661c2d79238cfd61b72a2e21e766c6092330e97e2b6b6f3bd` (= the prepared.png).
- **WebP:** `assets/robots/holiday-friday/holiday-friday-full-body.webp`, sha256 `625ee13ca13872fefdc0f0ed53d0d1268ea86ca1d71705645971838b160c53f1`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
