# Oli (LimX): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** LimXDynamics's. No open licence is presumed. The site credits it as "Image: LimX Dynamics, Oli HU_D04 dexterous-hand configuration, technical render".
- **Page:** https://github.com/limxdynamics/humanoid-description/blob/master/README.md
- **File:** https://raw.githubusercontent.com/limxdynamics/humanoid-description/master/docs/images/hu_d04_hand.png
- **Context (Codex):** Existing official repository technicalrender HU_D04+DEXTEROUSHAND, native800x800, not newlyrenderedURDF. READMEexplicitlyidentifiesOli(HU_D04)andthisexactimage. Wholeforefrontleftfigure, bothfeet/head/handscomplete, bodyabout640pxhigh, no resizing. Exclude title,handdetailcircleandbluefloorhalo/reflection withmaskonly; preserveactualbluecastofrobotRGB. Caption OliHU_D04dexterous-handconfiguration, technicalrender. NotLuna,notHU_D03,notclaimphysicalhardwarephoto.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/limx-oli-hu-d04-hand/`.
- **Original:** `original.png`, 800 × 800 px, RGBA, 363,270 bytes, sha256 `5f92c8b212960c0100ea8c41748ab51a1330d5c532e1a00188a45a395f80e4e4` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230; largest region kept); crop ROI [0, 0, 800, 800], alpha bounding box [214, 81, 689, 719], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `a183e5a19fc2d2b63f66bde682d5ca785b385865c46ca861078224d6565d7920`, mask sha256 `96c3f440c756d1b52ea75b1bed68aec73907e5a4635554ab45e979a19225668f`.

## Catalogue identity

- **Record:** catalogue id 51, Lab "LimX", Robot "Oli".
- The HU_D04 + dexterous hand image in LimX Dynamics' official repository, whose README names it as Oli (HU_D04): an existing technical render at its native 800 × 800, not a new rendering. The whole figure with head, both hands and both feet; the title, the hand-detail circle and the floor halo are excluded by the alpha mask, and the robot keeps its blue cast. Not Luna and not HU_D03.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 13, PR 242, merge c314f66, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/limx-oli-hu-d04/limx-oli-hu-d04-full-body.png`, 515 × 678 px, sha256 `a183e5a19fc2d2b63f66bde682d5ca785b385865c46ca861078224d6565d7920` (= the prepared.png).
- **WebP:** `assets/robots/limx-oli-hu-d04/limx-oli-hu-d04-full-body.webp`, sha256 `9f8a702bb31fe1a5852d25e51009e4b4ff5f2e3678c4ba948769ca29a33a51a9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
