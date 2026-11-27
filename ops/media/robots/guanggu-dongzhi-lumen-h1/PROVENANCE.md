# Lumen H1 (Guanggu Dongzhi): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Guanggu Dongzhi / HECBOT's. No open licence is presumed. The site credits it as "Image: Guanggu Dongzhi / HECBOT".
- **Page:** https://www.hecbot.cn/product.html?type=22
- **File:** https://www.hecbot.cn/ggdz/2026/05/20/5bGyi00nj43qu.webp
- **Context (Codex):** Lumen H1 complete yellow/grey robot explicitly labelled Lumen H1 interaction/service robot on official product page. No other H1 maker or model.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/lumen-h1/`.
- **Original:** `original.webp`, 1366 × 2079 px, RGBA, 131,024 bytes, sha256 `912e069722e8d6bd9422925616d47eee6af4eb11e5056c016ca6ca703588d152` (equal to Codex's manifest).
- **Codex's preparation:** original with its own transparency; non-generative alpha mask (Alpha levels85..230; small background components excluded; original RGB unchanged.); crop ROI [0, 0, 1366, 2079], alpha bounding box [256, 60, 971, 1907], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `59c3fe4e40518363bac40a20dba1f3d2fe2b6435a734465071056db9a2df4db5`) and the mask (sha256 `b02ed84dc92b18e26140643ef2671cc523d87cfe6d3841f8d8360f6a4030eb84`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 181, Lab "Guanggu Dongzhi", Robot "Lumen H1".
- Lumen H1, the yellow and grey robot labelled "Lumen H1" on Guanggu Dongzhi's official HECBOT product page. No other maker's H1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 7, PR 225, merge 8b33837, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/guanggu-dongzhi-lumen-h1/guanggu-dongzhi-lumen-h1-full-body.png`, 755 × 1887 px, sha256 `59c3fe4e40518363bac40a20dba1f3d2fe2b6435a734465071056db9a2df4db5` (= Codex's prepared.png).
- **WebP:** `assets/robots/guanggu-dongzhi-lumen-h1/guanggu-dongzhi-lumen-h1-full-body.webp`, sha256 `ca4c94d7fa9d51ff7eeab625ccbdb8143b371ba8e769f968f58bc2d54a0ee554`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
