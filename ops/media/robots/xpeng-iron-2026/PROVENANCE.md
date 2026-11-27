# Next-Gen IRON (Xpeng): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** XPENG's. No open licence is presumed. The site credits it as "Image: XPENG, IRON, September 2026 production-line photograph".
- **Page:** https://xpeng-newsroom.pr.co/de-AT-AT/270304-xpengs-humanoider-roboter-iron-verlasst-auf-eigenen-fussen-seine-produktionslinie/
- **File:** https://d21buns5ku92am.cloudfront.net/70277/images/699713-XPENG%20IRON_04-f7eb9d-original-1788864320.jpeg
- **Context (Codex):** OfficialXPENGpressroom articleSeptember2026, assetXPENGIRON_04, original6000x4000photo. Wholewhitebodysuitbipedwalkingaloneinproductionline, completeheadhandsandbothfeet, noocclusionfrompeople. Isolateforegroundrobot, exclfloorreflection/backgroundindustrialarms. CaptionIRON, September2026production-linephoto frommanufacturerpresskit. Thisisthenew2026form, notearlier2024hardware, noassertionproductionvolume/autonomy/specs. SourcePR.coisXPENGownedmanufacturerpressroom, notthirdpartyimagecatalogue.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/xpeng-iron-2026/`.
- **Original:** `original.jpg`, 6000 × 4000 px, RGB, 9,281,450 bytes, sha256 `a541946201f796db3a7ce98ee134f8eee28eb37a3db0a2d19a1d7df1703c0a7c` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [1400, 450, 2900, 3700], alpha bounding box [297, 1038, 990, 3119], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `bc16ef10f211ab9db3d9dbe7b5517f796d394cfb239a46a496c9bdfbc286674c`, mask sha256 `2d591b7ca682c67d8b8c021725dd42e744200352df8b205200c1b423192d5f91`.

## Catalogue identity

- **Record:** catalogue id 104, Lab "Xpeng", Robot "Next-Gen IRON".
- A photograph from XPENG's own press room (article of September 2026, 6000 × 4000): the 2026 form of IRON walking alone along a production line, with head, both hands and both feet. The production line, the industrial arms and the floor reflection are excluded by the alpha mask. It shows the 2026 form, not the 2024 hardware, and says nothing about production volume or autonomy.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 13, PR 242, merge c314f66, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/xpeng-iron-2026/xpeng-iron-2026-full-body.png`, 733 × 2121 px, sha256 `bc16ef10f211ab9db3d9dbe7b5517f796d394cfb239a46a496c9bdfbc286674c` (= the prepared.png).
- **WebP:** `assets/robots/xpeng-iron-2026/xpeng-iron-2026-full-body.webp`, sha256 `be7d32429bb9459f3c542dcf1ad4d7723dc5a2c7152527fbd6ec927486b35c55`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
