# Isaac (Weave): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Weave Robotics's. No open licence is presumed. The site credits it as "Image: Weave Robotics, Isaac 0".
- **Page:** https://www.weaverobotics.com/
- **File:** https://www.weaverobotics.com/_next/image?url=%2Fimages%2Fproducts%2Fisaac-0-front.webp&w=3840&q=75
- **Context (Codex):** Official Weave homepage exact file isaac-0-front.webp with alt Isaac0. Generic catalogue Isaac has unresolved generation/mobility caveat; name Isaac0 shown, do not call Isaac1 or infer powered locomotion. Whole two-arm column platform and caster/base remain. No catalogue data change.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/weave-isaac-0/`.
- **Original:** `original.img`, 1200 × 1600 px, RGB, 29,144 bytes, sha256 `c7641c7fc3f087b5ce103b2271a74d72c4a23d536ebc04d48fd6a22829ee840b` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad; Reviewed opaque robot interiors restored to255 inside eroded silhouette, originalRGB unchanged.; Alpha-only removal of visually verified background colour (+/-1 RGB) in specific interior gaps, no global colour deletion. Regions: [([754, 715, 784, 765], [236, 236, 236]), ([804, 636, 829, 652], [236, 236, 236])]; Verified gap edges receive1px expansion with0.45px alpha antialias; body colours untouched.; Claude, alpha only: luminance key (white 228) in prepared rect [496, 559, 523, 608]); crop ROI [0, 0, 1200, 1600], alpha bounding box [279, 177, 892, 1500], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `1cfec8651a14b4c8ff5257cc4310c4002b39ca2b391d59ae53814a8984c1173a`, mask sha256 `71a37b51a71772cc6e1ca217a08842c3ad8412729a677a7587be6b77e6181a88`.

## Catalogue identity

- **Record:** catalogue id 98, Lab "Weave", Robot "Isaac".
- Weave's homepage file isaac-0-front.webp, alt "Isaac 0". The record is Isaac without a generation; the master notes that Isaac 1 uses a wheeled base and Isaac 0 is stationary. The image is Isaac 0, not Isaac 1, and the casters on its base are not taken as powered locomotion.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 9, PR 230, merge 98b6aa5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/weave-isaac-0/weave-isaac-0-full-body.png`, 653 × 1363 px, sha256 `1cfec8651a14b4c8ff5257cc4310c4002b39ca2b391d59ae53814a8984c1173a` (= the prepared.png).
- **WebP:** `assets/robots/weave-isaac-0/weave-isaac-0-full-body.webp`, sha256 `7d4eea46e5cb00546691149ede5a6a59f6604dfe57c854da3ea39000b94caf29`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
