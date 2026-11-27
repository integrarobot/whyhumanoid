# G1 (Galbot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Galbot's. No open licence is presumed. The site credits it as "Image: Galbot, G1 manufacturer product render via European Product Design Award (2026)".
- **Page:** https://www.productdesignaward.eu/winners/epda/2026/12837/
- **File:** https://s3-us-west-2.amazonaws.com/productdesignaward/upload/3264595/22895726/full/64529c2e68d22e7f7759126043cee614.png
- **Context (Codex):** Manufacturer-submitted GALBOT G1 award entry 2026, Company Galbot, Client Galbot, visible Photo Credit Galbot, official project link galbot.com. Third-party award hosting explicitly acknowledged, not open licence assumed. Native4500x3375 existing manufacturer product render, two complete separated configurations. Choose LEFT standing figure ONLY, entire head, both actual articulated hands, lift leg, complete base and wheels. Approx ROI[800,200,2400,3000] but independently determine exact native geometry. Both figures are separated, no body overlap. Remove floor shadow and right crouching robot. Caption Galbot, G1 manufacturer product render via European Product Design Award (2026). Whole selected figure root inspected at native scale. NOT another company Unitree G1 tennis footage, no new capabilities/specs. Needs independent alpha-only mask/review, no RGB edits or upscale.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27), 62f03ab (candidates-28), 26e018a (candidates-30) and a7c0ffb (candidates-31)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/galbot-g1-award-native/`.
- **Original:** `original.png`, 4500 × 3375 px, RGBA, 4,093,477 bytes, sha256 `51f6711b14a65954ab429d6ae9aca1635edfe45c68edd22210ceddf517014426` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240; largest region kept; levels 150..240; the largest region kept, which drops the fingertips of the crouching robot on the right that reach into the region; the original alpha (218..255) lies only off the robot and is not used); crop ROI [880, 230, 2340, 3000], alpha bounding box [81, 109, 1421, 2707], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `934eda69b45a424d6f9ff0c23dd23a7f2d95fe0df9674280792bc066655ce7d1`, mask sha256 `2320624ecada7696879d9fc2815518472d057e53f47f0fccdac8edffd0a70996`.

## Catalogue identity

- **Record:** catalogue id 35, Lab "Galbot", Robot "G1".
- The left, standing figure of the G1 render that Galbot submitted to the European Product Design Award 2026 (native 4500 × 3375; the entry names Galbot as company and client and credits the photo to Galbot): the whole robot with head, both articulated hands, the lift leg and the complete wheeled base. The crouching second G1 on the right, the white studio and the floor shadow are excluded by the alpha mask. It is Galbot's G1, not Unitree's G1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 15, PR not yet merged)

- **PNG:** `assets/robots/galbot-g1/galbot-g1-full-body.png`, 1380 × 2638 px, sha256 `934eda69b45a424d6f9ff0c23dd23a7f2d95fe0df9674280792bc066655ce7d1` (= the prepared.png).
- **WebP:** `assets/robots/galbot-g1/galbot-g1-full-body.webp`, sha256 `4edaf0254bcaaca45a1422f479e7ccaf139809439357dd6bd6e964cf40bdf3a5`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
