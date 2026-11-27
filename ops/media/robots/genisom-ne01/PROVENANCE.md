# NE01 (GENISOM): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** GENISOM's. No open licence is presumed. The site credits it as "Image: GENISOM".
- **Page:** https://www.genisomai.com/product-robot/ne01
- **File:** https://qiniu.mfdemo.cn/zhishen/2026/08/17/5k5fyNizL77mu.webp
- **Context (Codex):** NE01 Ultra configuration as explicitly shown in the manufacturer NE01 family specifications; exact image is Ultra, not a claim that every NE01 configuration looks the same. Caption must name the shown variant. Entire robot and both feet included.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/genisom-ne01/`.
- **Original:** `original.webp`, 1920 × 1080 px, RGB, 14,342 bytes, sha256 `674e48b1121c231e1c40fb578677245666e39540b28b9f83f35ad36971671200` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small isolated background components excluded; RGB unchanged.); crop ROI [0, 0, 1920, 1080], alpha bounding box [817, 121, 1103, 938], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `00c40ef32b1a9d582158742ec594a1c9e88787395fcb158dc32057e96c92ab63`) and the mask (sha256 `568dc66bf786b58f63c821145b2d8435067ad0e8caa2ae175b4c3b1d1b162739`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 177, Lab "GENISOM", Robot "NE01".
- The NE01 Ultra configuration, as GENISOM (智身科技) shows and names it in the official NE01 family specifications. The record is the NE01 family: the image illustrates it with this named variant, which the alt text states; it is not a claim that every NE01 configuration looks the same.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 7, PR 225, merge 8b33837, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/genisom-ne01/genisom-ne01-full-body.png`, 326 × 857 px, sha256 `00c40ef32b1a9d582158742ec594a1c9e88787395fcb158dc32057e96c92ab63` (= Codex's prepared.png).
- **WebP:** `assets/robots/genisom-ne01/genisom-ne01-full-body.webp`, sha256 `873a2ef816abcae8a6dd848805a1beecb1d19931bab6db6db3bfed1f087b6bfa`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
