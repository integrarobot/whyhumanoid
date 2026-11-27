# Humanoid service (model unconfirmed) (Nucleus): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 18, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Nucleus's. No open licence is presumed. The site credits it as "Image: Nucleus, service platform shown in official video, rear view (2026)".
- **Page:** https://nucleuslab.ai/
- **File:** https://nucleuslab.ai/assets/nucleus-hero-clean-20s.mp4
- **Context (Codex):** Official Nucleus homepage video and linked /worker/ product page identify its mobile dual-arm service platform. Select LEFT single complete robot in REAR VIEW at native frame 193 (7.72 seconds/25fps). Approximate ROI x190..665 y270..950. Right foreground robot is clipped and is NOT selected. Complete head, both arms/end effectors, articulated column and entire mobile base. Hands at its waist have normal self-occlusion; no external bin covers selected robot. Keep actual black arm/back cables and white controller lead loop sitting on left of base, controller and emergency stop. Remove shelves, other robot and floor only via alpha. No reconstruction or new robot design. Caption Nucleus, service platform shown in official video, rear view (2026). DO NOT call Nucleus original hardware manufacturer or infer underlying OEM/model; exact OEM remains unconfirmed in catalogue. Official product /worker/ https://nucleuslab.ai/worker/ describes two arms and mobile base. This identifies platform as used/shown by service provider, not a new confirmed manufacturer/model.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 5083e8a (candidates-48), 2021f8c (candidates-49) and 6f9b29e (candidates-51)); kept in `ops/media/intake-remaining-2026-11-27/batch-18/nucleus-official-service-platform-rear/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 1,233,767 bytes, sha256 `5bdec4738efaacb776b240750149422c2f63ddde66f65e0cb3257c9d78cfdb82` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-background-removed-mask.png; levels 150..240; the model mask took in two pieces of background, removed by alpha only: the light shelf beam seen between the left arm and the back (x up to 357, y 452..477 of the original, right of the arm edge) and the dark edge and orange stub of a box behind the right elbow (x 583..606, y 414..450, above the arm and away from the black cable). The black cables of both arms, including the loop under the right wrist and the ones crossing the back and mast, and the white controller and cable on the base are kept; segmentation-birefnet-background-removed-mask.png is the mask used); crop ROI [170, 250, 690, 970], alpha bounding box [39, 36, 464, 685], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `4dc4686236f3e4088285b11a539671dacf90e684719c14bb31fa0e2c19969ea1`, mask sha256 `645052054077d5483626b62998cf851a0785bc660a99ff2fab0d24a2fdc90638`.

## Catalogue identity

- **Record:** catalogue id 125, Lab "Nucleus", Robot "Humanoid service (model unconfirmed)".
- Frame 193 (7.72 s) of the official video on Nucleus' homepage and worker page, at its native 1920 × 1080: the left platform seen from behind, whole, with head, both arms and grippers, their black cables, the mast and the wheeled base with its white controller and cable. The shelving, the boxes and the other robot are excluded by the alpha mask. It is the platform Nucleus shows; nothing is said about who makes it or which model it is.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 18, PR not yet merged)

- **PNG:** `assets/robots/nucleus-service-platform/nucleus-service-platform-full-body.png`, 465 × 689 px, sha256 `4dc4686236f3e4088285b11a539671dacf90e684719c14bb31fa0e2c19969ea1` (= the prepared.png).
- **WebP:** `assets/robots/nucleus-service-platform/nucleus-service-platform-full-body.webp`, sha256 `0d60a98b6c2822ac82bf1713e088058f7c924c3765b189a1248be133c5cf5390`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
