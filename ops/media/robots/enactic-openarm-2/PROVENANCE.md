# OpenArm 2.0 (arms) (Enactic): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Enactic's. No open licence is presumed. The site credits it as "Image: Enactic".
- **Page:** https://docs.openarm.dev/hardware/openarm-2.0/general/
- **File:** https://docs.openarm.dev/assets/images/openarm-2.0-204d2c840e8094cb2a8152d065040902.png
- **Context (Codex):** OpenArm 2.0 bimanual arm platform, complete mounted module. Not a whole humanoid; do not add limbs or a head.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 2daba0a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/enactic-openarm-2/`.
- **Original:** `original.png`, 3343 × 2323 px, RGBA, 2,891,417 bytes, sha256 `66971cbc3b1ae9e7d31b78573fa94e92d68314b8dfe5c738407e43c29a792b19` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small background components removed.); crop ROI [1650, 20, 3000, 2323], alpha bounding box [113, 150, 1108, 2169], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `b565008f8b4b4c2e1790a1692652245551907441161e9ca90700b73840e3b5f5`) and the mask (sha256 `aa9fcd62e1f91ee950d0c858da382c62eae73752d3ccc49246f150671c321fec`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 25, Lab "Enactic", Robot "OpenArm 2.0 (arms)".
- OpenArm 2.0 as shown in the official OpenArm 2.0 hardware documentation (docs.openarm.dev, image alt "OpenArm 2.0"). The record is an arms platform: the image shows the complete mounted two-arm module, with no body, legs or head added. Not an earlier OpenArm version.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 6, PR 216, merge b24a276, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/enactic-openarm-2/enactic-openarm-2-full-body.png`, 1035 × 2059 px, sha256 `b565008f8b4b4c2e1790a1692652245551907441161e9ca90700b73840e3b5f5` (= Codex's prepared.png).
- **WebP:** `assets/robots/enactic-openarm-2/enactic-openarm-2-full-body.webp`, sha256 `cf4bed812b83146db5ad0ecbb82423fe94275ae5132b14058cddc36f4597e3dc`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
