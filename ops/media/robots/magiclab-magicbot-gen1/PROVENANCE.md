# Magicbot (Magiclab): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** MagicLab's. No open licence is presumed. The site credits it as "Image: MagicLab, MagicBot Gen1 video still".
- **Page:** https://www.magiclab.top/en/human
- **File:** https://oss-cdn.magiclab.top/file/videos/z1/8f7cf6/89fceeddb859c6e9a66efb62b5ee0a3f.mp4
- **Context (Codex):** Official MagicBotGen1 exactproductpage/en/human embeds thisstraight-kneewalkingvideo withposterwalkGen.jpg. ThetechnicalURLdirectoryz1doesNOTidentifythepicturedrobotasZ1: pageheadingexplicitGen1, videoactualtallGen1hardware. Native1920x1080frame0at0s/25fps showswholeheadhandsandtwofeet, onefootraisedinactualwalkingpose, floormarginbelowplantedtoe. IsolateONLYrobot, nofloorshadow/backgroundbuilding/vehicle. Frame134wasREJECTEDbecauseapproachingfootcutsbottomedge; useframe0. CaptionMagicBotGen1officialvideostill. No claimautonomy/speedorinferredspecs. Needsindependentidentity/maskreview.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/magiclab-magicbot-gen1/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 742,881 bytes, sha256 `1c179ffbd106ddf941505bb2976ce853002f8741ea38d9060f6c0a4c881871bf` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [760, 80, 1240, 1080], alpha bounding box [99, 119, 375, 946], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `51f1574e6b11036b7599299010c7d948324b28b7d5b685fa728da40cd86f4122`, mask sha256 `21c35845febd3113fa7f0162c5097d1ff436192d52b7056f4841d77866e7eb93`.

## Catalogue identity

- **Record:** catalogue id 54, Lab "Magiclab", Robot "Magicbot".
- Frame 0 of the walking video on MagicLab's MagicBot Gen1 product page (native 1920 × 1080; the page heading names Gen1): the whole robot with head, both hands and both feet, one foot raised in its stride. The building, the street and the floor shadow are excluded by the alpha mask. It says nothing about autonomy or speed.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 13, PR 242, merge c314f66, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/magiclab-magicbot-gen1/magiclab-magicbot-gen1-full-body.png`, 316 × 867 px, sha256 `51f1574e6b11036b7599299010c7d948324b28b7d5b685fa728da40cd86f4122` (= the prepared.png).
- **WebP:** `assets/robots/magiclab-magicbot-gen1/magiclab-magicbot-gen1-full-body.webp`, sha256 `2f659165aadc6ae1b59a993581e70dd6ab0cf4fea9264122808836ca8f88858a`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
