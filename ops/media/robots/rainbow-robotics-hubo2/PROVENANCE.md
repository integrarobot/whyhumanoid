# Hubo (Rainbow): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Rainbow Robotics, via Rainbow Robotics Vietnam's. No open licence is presumed. The site credits it as "Image: Rainbow Robotics, HUBO2 product image via Rainbow Robotics Vietnam".
- **Page:** https://rainbow-robotics.vn/hubo2/
- **File:** https://rainbow-robotics.vn/images/ckeditor/images/202209151451348f46d5423a109969fc003dfe17608f03b56a3b10.png
- **Context (Codex):** Existing HUBO2 manufacturer product image hosted on Rainbow Robotics Vietnam regional/reseller product page, NOT falsely presented as downloaded from global manufacturer server. ExactpageHUBO2, 120cm43kg38DOF technical text matches global legacy page https://rainbowrobotics1.cafe24.com/hubo2 which is currently DNSunreachable here but searchindexed. Native1206x1658 whole head, hands, feet with margins; chest branding HUBO/KIST/Rainbow. The alt attribute RBQ is a mistakengenericreusedalt on this page; visible biped and HUBO chest plus exact page title/body identify HUBO2, not a quadruped. Caption explicitly Rainbow Robotics, HUBO2 product image via Rainbow Robotics Vietnam; record70Hubofamily, no spec change. Rootinspectedwholebodycontactsheet. RegionalsitehasRPMEC contact; do not assert it is a wholly owned subsidiary or newly verified authorized partner. Treat as third-party-hosted maker product image, analogous to archived maker brochures. Alpha-only segmentation, preserve RGB/native20pxpadding; exclude whitebackground/floor shadow.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27), 62f03ab (candidates-28) and 26e018a (candidates-30)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/rainbow-hubo2-front/`.
- **Original:** `original.png`, 1206 × 1658 px, RGBA, 1,175,043 bytes, sha256 `38fe5cc3103b3785f3d6a36ebe3927195a19d8e0a4e1982802fd00288889a979` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240; largest region kept; levels 150..240; the original carries an alpha channel, but it is an opaque white rectangle around the robot, so the cutout is computed from the model mask); crop ROI [0, 0, 1140, 1658], alpha bounding box [7, 20, 1082, 1613], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `9b0c118cf89fe9f2d69510dab140d5f7963889d64cedb088301b7caca5edcd88`, mask sha256 `463249e3c4c096f1be2e909ca1f6440108d6ae5c6bb55be787e3b9d9597e5746`.

## Catalogue identity

- **Record:** catalogue id 70, Lab "Rainbow", Robot "Hubo".
- The HUBO2 product image on the HUBO2 page of Rainbow Robotics Vietnam, a regional site that hosts the maker's product material (native 1206 × 1658): the whole robot with head, both hands and both feet, the chest marked HUBO, KAIST and Rainbow. The page's alt text says RBQ, but the page title, the text and the visible robot are HUBO2. The white studio and the floor shadow are excluded by the alpha mask; the original's own alpha is only an opaque rectangle and is not used.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 15, PR not yet merged)

- **PNG:** `assets/robots/rainbow-robotics-hubo2/rainbow-robotics-hubo2-full-body.png`, 1115 × 1633 px, sha256 `9b0c118cf89fe9f2d69510dab140d5f7963889d64cedb088301b7caca5edcd88` (= the prepared.png).
- **WebP:** `assets/robots/rainbow-robotics-hubo2/rainbow-robotics-hubo2-full-body.webp`, sha256 `b4166332a8cb371deb9d9fd6aca9931129aa5f944660d6f0bab55d879e5f07e6`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
