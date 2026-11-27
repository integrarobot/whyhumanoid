# M1 (Phybot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** PHYBOT's. No open licence is presumed. The site credits it as "Image: PHYBOT, M1 manufacturer render".
- **Page:** https://www.phybot.tech/en/phybot-m1
- **File:** https://www.phybot.tech/assets/images/PHYBOT_M1_006252-KTn1Ppv6.png
- **Context (Codex):** Maker M1 desktop product chunk BigRobotDetail-7A4jDJBI.js refers this existing manufacturer render native2280x1080, two full views. Choose ONLY FRONT/threequarter robot left of pair, approximateROI[450,80,1100,1000] (root native inspected complete head, both hands, bothfeet, raisedfoot pose). Independently widen to include margins. Blue curved dimension arcs and176cm text stand OUTSIDE body; remove all graphic text/lines/other rear view via alpha; no body labels/dots on this selected figure. Darkbody on darkgradient needs careful segmentation. Do not use other sourceimages with blue joint overlays or specificationcallout dots ON body. Caption M1 manufacturer render, no specs reassignment or capability claim.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/phybot-m1-complete/`.
- **Original:** `original.png`, 2280 × 1080 px, RGBA, 1,066,942 bytes, sha256 `974e994ee1749ca52d5cafc901894aefb5eba019f296a85cfb6036d3a0f5fcff` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [450, 80, 1100, 1000], alpha bounding box [167, 12, 589, 904], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `5187e28e690ea702e520393ec6166b7bb52c6f8dcbd826573ac5169d7694ad1e`, mask sha256 `24fb7f7bd92ab5339e1d596d017927b42b84757d9a19053c91d372c86b7851fa`.

## Catalogue identity

- **Record:** catalogue id 63, Lab "Phybot", Robot "M1".
- The front three-quarter figure of the two-view render on PHYBOT's M1 product page (native 2280 × 1080): the whole robot with head, both hands and both feet, one foot raised. The second view, the blue dimension arcs and the text, which stand outside the body, are excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 14, PR not yet merged)

- **PNG:** `assets/robots/phybot-m1/phybot-m1-full-body.png`, 462 × 932 px, sha256 `5187e28e690ea702e520393ec6166b7bb52c6f8dcbd826573ac5169d7694ad1e` (= the prepared.png).
- **WebP:** `assets/robots/phybot-m1/phybot-m1-full-body.webp`, sha256 `dfa30bd155c11186138dc50c7ea5ff790ae0b9676fa3116eb53b63b974398f6c`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
