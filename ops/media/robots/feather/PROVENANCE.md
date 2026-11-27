# Feather (Feather): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Feather's. No open licence is presumed. The site credits it as "Image: Feather".
- **Page:** https://feather.dev/
- **File:** https://feather.dev/hero/frames/0007.webp
- **Context (Codex):** Complete front view of wheeled bimanual platform with lift and base.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 2daba0a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/feather/`.
- **Original:** `original.webp`, 1080 × 1080 px, RGBA, 40,862 bytes, sha256 `5b6eaf7772d9e3dc22d2584ae1f1d22818238d22bb79e741d51a64c86c9d629c` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small background components removed.); crop ROI [0, 0, 1080, 1080], alpha bounding box [375, 40, 705, 1016], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `68776980871abdbbacdacc782a8fa6e30c36da90a303af80a3fff3e4878d0a6d`) and the mask (sha256 `fbeaf2e2738234de8d5bb8d2052a736f3fe355e58f967a13fbf06960c69d2333`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 126, Lab "Feather", Robot "Feather".
- Feather as shown on feather.dev (hero frame 0007): the complete wheeled two-arm platform with its lift column and base. Edges follow the source file, which already carried transparency.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 6, PR not yet merged)

- **PNG:** `assets/robots/feather/feather-full-body.png`, 370 × 1016 px, sha256 `68776980871abdbbacdacc782a8fa6e30c36da90a303af80a3fff3e4878d0a6d` (= Codex's prepared.png).
- **WebP:** `assets/robots/feather/feather-full-body.webp`, sha256 `28fb0c919f7ecfaeb5bdcf37ba3da5bb8586580dd285f620caf6f0f991a2ab73`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
