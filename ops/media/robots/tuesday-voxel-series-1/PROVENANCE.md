# Voxel Series-1 (Tuesday Labs): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** TuesdayLabs's. No open licence is presumed. The site credits it as "Image: Tuesday Labs".
- **Page:** https://tuesdaylabs.com/robot
- **File:** https://tuesdaylabs.com/_next/image?url=%2Fimages%2Fhome%2Fhero-kitchen.jpg&w=3840&q=75&dpl=dpl_9W1G1tixftkcXvw18tsyTsH4hTAi
- **Context (Codex):** Exact current /robot page JSONLD Product has name Voxel Series-1 and explicitly lists https://tuesdaylabs.com/images/home/hero-kitchen.jpg as its product image. This source is the same hero-kitchen.jpg,2000x1500, whole orange robot crouching in kitchen, BOTH feet and hands/head visible. Do not reuse prior rejected white portrait cropped at shins. Preserve actual orange configuration; label manufacturer product image/illustration, not verified hardware deployment. Native figure height roughly750px, no enlargement.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/tuesday-voxel-series-1/`.
- **Original:** `original.jpg`, 2000 × 1500 px, RGB, 226,134 bytes, sha256 `c210ea4571a6f4e9c59db541f80b2a9bd4ebff921490e6c4fc7a1e661ae96ea1` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230; largest region kept); crop ROI [500, 450, 1050, 1420], alpha bounding box [124, 127, 494, 904], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `7cab8ffcc466646eb4f1561e5fa02cff790535d5e9b05ef7dd69761767d65a2d`, mask sha256 `d58d26c58b7d3bc61483f129cc03e7f40452bc5ac6ea0f85d30bc2611bbcf1fe`.

## Catalogue identity

- **Record:** catalogue id 131, Lab "Tuesday Labs", Robot "Voxel Series-1".
- hero-kitchen.jpg, the product image that the JSON-LD Product named Voxel Series-1 on Tuesday Labs' /robot page links to: the whole orange robot crouching, with both hands and feet; the kitchen is excluded. Replaces the earlier white portrait that ended at the shins. The record is Voxel Series-1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 11, PR not yet merged)

- **PNG:** `assets/robots/tuesday-voxel-series-1/tuesday-voxel-series-1-full-body.png`, 410 × 817 px, sha256 `7cab8ffcc466646eb4f1561e5fa02cff790535d5e9b05ef7dd69761767d65a2d` (= the prepared.png).
- **WebP:** `assets/robots/tuesday-voxel-series-1/tuesday-voxel-series-1-full-body.webp`, sha256 `6dda14c831572f6183c9ffafbfcf60d83c8bea9338192e914e6204516416cf2e`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
