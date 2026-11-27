# Walker S2 (Ubtech): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** UBTECH's. No open licence is presumed. The site credits it as "Image: UBTECH, Walker S2 render".
- **Page:** https://www.ubtrobot.com/en/humanoid/products/walker-s2
- **File:** https://owebsite-cdn.ubtrobot.com/resources/image/2025/07/22/700558958612549.jpg
- **Context (Codex):** Exact WalkerS2productpage manufacturer render1080x1530, robotstandingbesidebatterybank. Wholeheadbothhandsandbothfeet withfloorabovebottom, actualrobotbody~900px. IsolateONLYrobot, excludebatterybank(stagebackground,notattachedtoforeground), floormirror/shadowandbluewhitebackground. Rightarmvisibleseparatedfrombank, do notincludeitsleftborder. Other sources technicaldiagram74/75 touchtopheadborderandcarryannotationlinesONbody: do NOT substitute those. Caption manufacturer render, no proofbatteryperformance.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/ubtech-walker-s2/`.
- **Original:** `original.jpg`, 1080 × 1530 px, RGB, 191,954 bytes, sha256 `9c9c3939c3b8ad57bb217af43e7e780d6467287aa5fb44c9ea4f1a60e5419af8` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [240, 500, 680, 1480], alpha bounding box [46, 39, 384, 954], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `d6714a61c68a26ee8521d74c615e75d8131b6baa47372b0fc1590a13398fb62e`, mask sha256 `446111ab4832377b0d4784dbed4fc7a4e3ed92082924022a7b7e9d84264c0629`.

## Catalogue identity

- **Record:** catalogue id 142, Lab "Ubtech", Robot "Walker S2".
- The render on UBTECH's Walker S2 product page (native 1080 × 1530), where the robot stands beside a battery-swap cabinet: only the robot is kept, with head, both hands and both feet; the cabinet, its border, the floor reflection and the sky background are excluded by the alpha mask, and the right elbow that passes in front of the cabinet is kept whole. It is a manufacturer render and shows nothing about battery performance.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 12, PR 240, merge fa0b12c, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/ubtech-walker-s2/ubtech-walker-s2-full-body.png`, 378 × 955 px, sha256 `d6714a61c68a26ee8521d74c615e75d8131b6baa47372b0fc1590a13398fb62e` (= the prepared.png).
- **WebP:** `assets/robots/ubtech-walker-s2/ubtech-walker-s2-full-body.webp`, sha256 `47a532a266f59b13223323e578fd335814ca8f3fe429113bc6deb8feccf23a1d`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
