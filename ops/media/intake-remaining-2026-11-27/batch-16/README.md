# Robot image batch 16: published package

Published with PR 251 (reviewed head eaf3afd, CI 46064317211; merge 43d8984, Pages 46064669376, 27 Nov 2026) and verified in production by Claude and Codex. `mapping.json` lists the ten integrated images.

## Integrated (ten)

| Record | Folder | Cutout | Visible caption |
|---|---|---|---|
| 202 TLIBOT T1 | `tlibot-t1pro-brochure/` | the PDF image's own soft mask | TLIBOT, T1 Pro manufacturer brochure image (2025), via World Robot Conference |
| 123 Lumi | `lightberry-lumi-rooftop/` | BiRefNet mask, levels 150..240 | Lightberry, Lumi manufacturer photograph, rooftop configuration |
| 205 Tian Yi 2.0 | `tianyi-2-brochure-scene/` | BiRefNet mask, levels 150..240 | X-Humanoid, TianYi 2.0 manufacturer brochure render (2025), via World Robot Conference |
| 155 D9 | `pudu-d9-brochure-original/` | the PDF image's own soft mask | Pudu Robotics, D9 manufacturer brochure render (2025) |
| 95 Vanar Generation 1 | `vanar-generation1-product-render/` | BiRefNet mask with six openings removed by distance to the flat studio grey (reviewed by Codex) | Vanar Robots, Generation 1 manufacturer product render |
| 58 NEURA 4NE1 | `neura-4ne1-gen4-native-video/` | BiRefNet mask on the left foreground robot, levels 150..240 | NEURA Robotics, 4NE1 Gen 4 reveal, manufacturer video still (October 2026) |
| 185 KAIST Humanoid | `kaist-humanoid-v09-native-video/` | BiRefNet mask, levels 150..240; background rods excluded; head handle bar completed from mask and luminance | KAIST DRCD Lab, KAIST Humanoid v0.9 official video still (October 2026) |
| 184 JAKA π | `jaka-pi-native-video/` | BiRefNet mask on the central foreground robot, levels 150..240 | JAKA Robotics, JAKA π official video still (July 2026) |
| 209 ZJ Humanoid i3 | `zj-humanoid-i3-native-video/` | BiRefNet mask, levels 150..240 | ZJ Humanoid, i3 official product video still, walking configuration (2026) |
| 33 GAC GoMate | `gac-gomate-2024-product-render/` | BiRefNet mask, levels 150..240 | GAC Group, GoMate manufacturer product render (2024), video still via Gasgoo Auto News |

Every visible pixel keeps the original's RGB at native resolution, with a 20 px transparent margin; nothing is enlarged or generated. The batch was checked with `ops/media/robots/review-intake.py` (10/10). `contact-sheet-light-dark.jpg` shows the ten on light, dark and magenta grounds.

Notes for review:
- T1 Pro and D9: the originals are PDF image objects with their own soft masks (`pdf-native-rgb.png`, `pdf-native-softmask.png`), combined without rendering the page; only cropped and padded. T1 Pro's soft mask leaves a 339 px slit between the rod and the shin semi-transparent (review-intake: inspect); D9's leaves the diagonal slots of the hip vent grille open. Neither is changed.
- Vanar: inside six rectangles (the four hip and knee U-bracket interiors and the two elbow gaps) the background grey of exactly 52 seen through the openings is made transparent by distance to that grey; the masks before and after are both kept. Codex accepted the six corrections, not widened. Four small flat-grey zones (two hip slots at x 3412..3433 and 3237..3257, y 2229..2260; x 2922..2936, y 2113..2200; x 3414..3458, y 2532..2563) stay opaque: it is not shown that they are background (review-intake: flat-background warnings).
- KAIST: two thin vertical background rods to the left of the neck are excluded (x 1012..1034, y 228..262). The rectangular handle on top of the head belongs to the robot (Codex, frames 4650 to 4850); its dark left bar (x 1030..1062, y 142..150) was weak in the model mask, so in that rectangle only the alpha is raised from the re-levelled mask and the bar's own luminance; nothing is drawn.
- NEURA: record 58's page mixes generations; Gen 4 is the one chosen (Codex). The left foreground robot only; the front right robot (clipped) and the centre one (ribbon) are not used.
- Lumi: the photograph comes with an announcement; nothing from it is added to the record.

## Not in this batch

- **Jingchu Elf (183)**, candidates-41 (7a9d62e), Changjiang Daily photograph of 17 September 2025: the left gripper hangs in front of a dark green tablecloth of the same colour as the robot's dark parts; neither the model nor a luminance key separates it without losing parts of the gripper. Not reconstructed; no files kept.
- Qinglong (69), T230A (89), R-Noid (77) and IGRIS (79) stay out with the reasons given in batches 12 to 15.

Sources: Codex's `candidates-35` (8ba9356), `candidates-36` and `37` (91a9ac1), `candidates-38` (feb3c3e), `candidates-39` (e0d60a7), `candidates-40` (5168cc8), `candidates-41` (7a9d62e), `candidates-42` (1c2c9a0) and `candidates-43` (efea6c9) on `codex/image-sources-remaining`, copied selectively.
