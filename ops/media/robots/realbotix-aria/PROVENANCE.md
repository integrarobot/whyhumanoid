# Aria (Realbotix): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Realbotix's. No open licence is presumed. The site credits it as "Image: Realbotix, Aria Series 1".
- **Page:** https://www.realbotix.com/
- **File:** https://www.realbotix.com/_next/image?url=%2Frobots%2Faria-full-body.jpg&w=3840&q=75&dpl=dpl_CvS1HghmeWVK3z4WA2ULrC68dwiS
- **Context (Codex):** Official Realbotix homepage exact image aria-full-body.jpg, alt Aria, a full-body Series1, standing on its lit base. Whole named robot, both hands and feet and entire circular display base. Name Aria Series1 shown. Source RGB retained; grey studio background/floor masked.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/realbotix-aria/`.
- **Original:** `original.img`, 1599 × 2132 px, RGB, 139,682 bytes, sha256 `814b9618d3070c559274ea465d410852a511fc8f6c77a9b9a82003e4d3a07a6e` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad; Claude, alpha only: segmentation mask segmentation-birefnet-mask.png (BiRefNet general via rembg, mask only, on the original; kept beside it) levelled 85..230 in prepared rect [398, 1100, 436, 1540]; segmentation mask segmentation-birefnet-mask.png (BiRefNet general via rembg, mask only, on the original; kept beside it) levelled 85..230 in prepared rect [550, 575, 640, 900]; segmentation mask segmentation-birefnet-mask.png (BiRefNet general via rembg, mask only, on the original; kept beside it) levelled 85..230 in prepared rect [228, 595, 286, 770]; segmentation mask segmentation-birefnet-mask.png (BiRefNet general via rembg, mask only, on the original; kept beside it) levelled 85..230 in prepared rect [585, 300, 750, 830]); crop ROI [0, 0, 1599, 2132], alpha bounding box [426, 99, 1209, 2025], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `4fd378323611015b291c95253f39ec147c480f897325183c45aa70f16dd6656f`, mask sha256 `22438331d88b7d3b2f68bd7e94de3922aa57b4b3d299271b7f402d2f3fb68850`.

## Catalogue identity

- **Record:** catalogue id 72, Lab "Realbotix", Robot "Aria".
- Realbotix's homepage image aria-full-body.jpg, whose own alt reads "Aria, a full-body Series1, standing on its lit base". The whole robot with both hands, feet and its circular lit base. The record is Aria; the caption names Series 1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 9, PR 230, merge 98b6aa5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/realbotix-aria/realbotix-aria-full-body.png`, 823 × 1966 px, sha256 `4fd378323611015b291c95253f39ec147c480f897325183c45aa70f16dd6656f` (= the prepared.png).
- **WebP:** `assets/robots/realbotix-aria/realbotix-aria-full-body.webp`, sha256 `edf13f444004d21ea5a48aa6896896d3919681b69e241ef3a6bc912d4c7668a7`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
