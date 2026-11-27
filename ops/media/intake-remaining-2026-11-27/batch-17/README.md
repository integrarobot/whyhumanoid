# Robot image batch 17: published package

Published with PR 253 (reviewed head 1850c21, CI 46066494734; merge 36ea0eb, Pages 46066898699, 27 Nov 2026) and verified in production by Claude and Codex. `mapping.json` lists the four integrated images: the valid sources of the latest sweep. The records still without an image are not resolved by this batch.

## Integrated (four)

| Record | Folder | Cutout | Visible caption |
|---|---|---|---|
| 122 XYZ DEUX | `xyz-deux-complete-original-alpha/` | the PNG's own alpha, cropped and padded only | XYZ, DEUX manufacturer product render, mobile dual-arm platform |
| 12 Beomni | `beomni-2023-manufacturer-press-image/` | BiRefNet mask; white rim of the antennas and head arcs lowered by distance to white | Beyond Imagination, Beomni manufacturer press image (2023), via Newswire |
| 156 LimX Luna | `limx-luna-brochure-whole-walk/` | BiRefNet mask on the large walking figure, levels 150..240 | LimX Dynamics, Luna manufacturer brochure render (June 2026), walking configuration |
| 213 Gino 1 | `geekplus-gino1-native-rear-view/` | BiRefNet mask, levels 150..240 | Geekplus, Gino 1 official video still, rear view with backpack basket (2026) |

Every visible pixel keeps the original's RGB at native resolution, with a 20 px transparent margin; nothing is enlarged or generated. The batch was checked with `ops/media/robots/review-intake.py` (4/4). `contact-sheet-light-dark.jpg` shows the four on light, dark and magenta grounds.

Notes for review:
- DEUX: a mobile dual-arm platform with a sensor crossbar, three-finger hands, a column and a base; no head or legs are added.
- Beomni: in the press JPEG the two antennas and the arcs over the head are one or two pixels wide and carried a white rim of the background. Inside x 580..680, y 40..92 of the original the alpha is lowered by distance to white (transparent at 8 or less, kept at 26 or more), except over the white LED on top of the head (x 626..648, y 69..87), which a first pass had pierced; the arcs keep a faint light edge from the JPEG. Both masks are kept (`segmentation-birefnet-mask.png`, `segmentation-birefnet-keyed-mask.png`).
- Luna: only the large walking figure on the brochure page; the LIMX Luna lettering lies behind and outside the silhouette and is out, as are the small overlaid figures and the cover torso.
- Gino 1: a rear view; the backpack basket and its side cable are part of the configuration and are kept; the hidden front is not reconstructed. The subtitles lie below the figure.

Sources: Codex's `candidates-44` (c21bf62), `candidates-45` (56c65d0), `candidates-46` (5c11af4) and `candidates-47` (acda4f4) on `codex/image-sources-remaining`, copied selectively.
