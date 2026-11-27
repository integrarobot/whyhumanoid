# T1 (Booster): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 3, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** Tsinghua Hephaestus team's. No open licence is presumed. The site credits it as "Image: Tsinghua Hephaestus (RoboCup team)".
- **Page:** https://humanoid.robocup.org/wp-content/uploads/Tsinghua_Hephaestus-specs-6788f79d3cf43.pdf
- **File:** https://humanoid.robocup.org/wp-content/uploads/Tsinghua_Hephaestus-specs-6788f79d3cf43.pdf
- **Source document:** `ops/media/intake-ab-2026-11-27/batch-03/booster-t1/source.pdf` (sha256 `60074d5fe83d305b00ae90a0692a9afbbf22c21609210f543077d7a826252e3d`), page 1, image xref 1.
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit eece0f8) and kept in `ops/media/intake-ab-2026-11-27/batch-03/booster-t1/`.
- **Original:** `original.png`, 393 × 590 px, RGB, 104,607 bytes, sha256 `1b386393cb355388f14d16a1d160d7231fa2de6b2239c41a0cdd3b1a44871887` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; Codex computed a non-generative mask (isnet-general-use), kept the original's RGB exactly and changed only alpha, crop and padding. Files `mask.png` and `prepared.png` (sha256 `92fd4e13a0dfeb77cb41573ffe9ae03792a74f504775de3ce3ed1a254d009c85`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 14, Lab "Booster", Robot "T1".
- Booster T1 as used by the Tsinghua Hephaestus RoboCup team: the photograph is on page 1 (xref 1) of the team's technical specification sheet, a primary RoboCup document hosted on humanoid.robocup.org (PDF sha256 60074d5fe83d305b00ae90a0692a9afbbf22c21609210f543077d7a826252e3d). It is not an image obtained from Booster's website; the robot is Booster's, the photograph is the team's. Not T2 (148), K1 (149) nor Tlibot T1 (202). Modest resolution: 393 × 590 original, figure 188 × 462, published at 228 × 502 with Codex's 20 px padding kept, no scaling and no simulated detail (recorded as a quality debt).

## Step here

`prepared.png` is used as delivered: Codex's 20 px padding kept, no trim and no scaling (trimming to 10 px would leave 482 px, under the 500 px minimum).

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 3, PR not yet merged)

- **PNG:** `assets/robots/booster-t1/booster-t1-full-body.png`, 228 × 502 px, lossless, sha256 `92fd4e13a0dfeb77cb41573ffe9ae03792a74f504775de3ce3ed1a254d009c85`.
- **WebP:** `assets/robots/booster-t1/booster-t1-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `7be2f5694cbb9e5508e8f7ed520ee6281536f76896fe4749c7feedaf1872f590`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
