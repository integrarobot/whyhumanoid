# Wanda (UniX): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** UniX AI's. No open licence is presumed. The site credits it as "Image: UniX AI, Wanda 2.0".
- **Page:** https://www.unix-group.ai/
- **File:** https://www.unix-group.ai/public/uploads/images/20250428/120f27d4e16f0da237540cb2d3c36cac.png
- **Context (Codex):** Official UniX homepage product image explicitly labelled Wanda 2.0. Generic Wanda family catalogue, separate Martian biped not used. Name 2.0 shown in alt/provenance; not an assertion all Wanda generations look identical.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/unix-wanda-2/`.
- **Original:** `original.png`, 408 × 1128 px, RGBA, 211,656 bytes, sha256 `420251d152066e74277b0e1601bf59296820ec8c934d697b2304fe5f83a4e66f` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad); crop ROI [0, 0, 408, 1128], alpha bounding box [1, 1, 407, 1042], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `8a24cae993c911eef956ab5c2d2e5f303d2d7a7adaa2527f55b5ac0d561603e9`, mask sha256 `22f4e7051b07996dae00ab768470e65767793a958f4cc60df4157b4ec83aa2ad`.

## Catalogue identity

- **Record:** catalogue id 94, Lab "UniX", Robot "Wanda".
- UniX AI's homepage labels this product image Wanda 2.0. The record is Wanda (wheeled dual-arm humanoid, not the separate Martian biped); the image is named Wanda 2.0 and is not taken to show every Wanda generation.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 9, PR 230, merge 98b6aa5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/unix-wanda-2/unix-wanda-2-full-body.png`, 446 × 1081 px, sha256 `8a24cae993c911eef956ab5c2d2e5f303d2d7a7adaa2527f55b5ac0d561603e9` (= the prepared.png).
- **WebP:** `assets/robots/unix-wanda-2/unix-wanda-2-full-body.webp`, sha256 `e2a73f43eebaa9b9d037120becff71cb9f0c1adfdbcdf5ae0fe59988d1100b1b`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
