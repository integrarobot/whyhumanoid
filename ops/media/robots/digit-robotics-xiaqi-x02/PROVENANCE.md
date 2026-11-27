# XiaQi X02 (Digit Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Digit Robotics's. No open licence is presumed. The site credits it as "Image: Digit Robotics".
- **Page:** https://www.digit.com.cn/ProductsDetail/93.html
- **File:** https://www.digit.com.cn/UserFiles/Article/children1/kdNcl2jh.png
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/xiaqi-x02/`.
- **Original:** `original.png`, 1587 × 2245 px, RGBA, 1,157,212 bytes, sha256 `11e72c61d5912623629fa55aa8730d35da4f7ab47e378341fa7318a4c17c33e2` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; crop ROI [0, 0, 1587, 2245], alpha bounding box [420, 176, 1164, 2077], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `59a1dfd46d782de2b9d58df5d471adb381ed60968acf855c5f75af765c4d5948`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 172, Lab "Digit Robotics", Robot "XiaQi X02".
- Native-alpha image of the official XiaQi X02 product page of Digit Robotics (数字华夏, digit.com.cn). Not Agility Robotics' Digit (6); not Xialan R03 (171).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 4, PR 208, merge e152f67, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/digit-robotics-xiaqi-x02/digit-robotics-xiaqi-x02-full-body.png`, 784 × 1941 px, sha256 `59a1dfd46d782de2b9d58df5d471adb381ed60968acf855c5f75af765c4d5948` (= Codex's prepared.png).
- **WebP:** `assets/robots/digit-robotics-xiaqi-x02/digit-robotics-xiaqi-x02-full-body.webp`, sha256 `5b9f4e0887b6383d3e773019774a0aea7be7e8fc8cb881db35ec95b6eb0d0618`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
