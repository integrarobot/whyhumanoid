# Linker Humanoid (Linkerbot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Linkerbot's. No open licence is presumed. The site credits it as "Image: Linkerbot".
- **Page:** https://www.linkerbot.cn/details/LinkerHumanoid/
- **File:** https://botdata.oss-cn-beijing.aliyuncs.com/afterSales/linkerbot_img/products/linker-humanoid/detail-2.png
- **Context (Codex):** Official exact Linker Humanoid page image detail-2.png. Whole wheeled platform, not cropped living-room torso. Native alpha had grey opaque background; ISNET plus interior opacity correction excludes it without RGB edits.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/linkerbot-humanoid/`.
- **Original:** `original.png`, 919 × 859 px, RGBA, 222,547 bytes, sha256 `5513a66459a32f2ae02b0e37bc337aa4015a6a76b2ab92ab7835b5e10a260bc8` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad; Reviewed opaque robot interiors restored to255 inside eroded silhouette, originalRGB unchanged.; Alpha-only removal of visually verified background colour (+/-1 RGB) in specific interior gaps, no global colour deletion. Regions: [([500, 316, 513, 364], [243, 243, 243]), ([518, 679, 552, 687], [243, 243, 243])]; Verified gap edges receive1px expansion with0.45px alpha antialias; body colours untouched.); crop ROI [0, 0, 919, 859], alpha bounding box [310, 103, 610, 826], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `d28ed1fdf27d1e86ff1949c323a4ebcddaa60c11bde10fddced8d397913b44b1`, mask sha256 `d69d7d6c0fb8228d684d16b9e12b5ffac95dbeb6be37b8f3a98675a2a9224b8f`.

## Catalogue identity

- **Record:** catalogue id 189, Lab "Linkerbot", Robot "Linker Humanoid".
- Linkerbot's Linker Humanoid page, image detail-2.png: the whole wheeled platform with its lifting column, not the cropped torso shown in a living room on the same page. The record is Linker Humanoid.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

- **Quality:** Small source: 340 × 763 px as prepared.

## Published files (image batch 9, PR 230, merge 98b6aa5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/linkerbot-humanoid/linkerbot-humanoid-full-body.png`, 340 × 763 px, sha256 `d28ed1fdf27d1e86ff1949c323a4ebcddaa60c11bde10fddced8d397913b44b1` (= the prepared.png).
- **WebP:** `assets/robots/linkerbot-humanoid/linkerbot-humanoid-full-body.webp`, sha256 `ec75d61f38d0df4c7971cfa0c4285e2cb6286bf18fc739cb9f15106da488a898`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
