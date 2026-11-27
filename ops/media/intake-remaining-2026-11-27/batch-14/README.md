# Robot image batch 14: published package

Published with PR 246 (reviewed head 0f05205, CI 46056641327; merge 6fecfb5, Pages 46056855660, 27 Nov 2026) and verified in production by Claude. `mapping.json` lists the ten integrated images; `manifest.json` also keeps one prepared candidate that was left out (IGRIS, below).

## Integrated (ten)

| Record | Folder | Cutout | Visible caption |
|---|---|---|---|
| 80 Phoenix | `sanctuary-phoenix-gen6/` | BiRefNet mask | Sanctuary AI, Phoenix Gen 6 launch graphic (2023) |
| 216 iX | `simplexity-ix-complete/` | the original's own alpha | Simplexity Robotics, iX manufacturer render, raised-hand configuration |
| 63 M1 | `phybot-m1-complete/` | BiRefNet mask on the front figure; arcs and text left out | PHYBOT, M1 manufacturer render |
| 160 MagicBot Z1 | `magiclab-z1-video/` | BiRefNet mask; balls and grass left out | MagicLab, MagicBot Z1 video still, round-ended-arm configuration |
| 206 TianGong Omni | `xhumanoid-omni-front/` | the original's own alpha, front figure only | X-Humanoid, TianGong Omni front-view technical render |
| 188 VB-01 | `lanxin-vb01-brochure/` | BiRefNet mask on a region wide enough for the left gripper | Lanxin Robotics, VB-01 VersaBot brochure image (2024) |
| 211 TITAN O1 | `westlake-titan-o1/` | the original's own alpha, levelled 110..240 so the translucent motion trail drops out | Westlake Robotics, TITAN O1 manufacturer render, running pose |
| 204 Tien Kung 3.0 | `tienkung-3-inverted/` | BiRefNet mask; original inverted orientation kept | Beijing Humanoid Robot Innovation Center, Tien Kung 3.0, inverted pose |
| 120 Memo | `sunday-memo-native-video/` | BiRefNet mask; the held plate kept, kitchen left out | Sunday, Memo official video still with plate |
| 182 JingChu 1 | `jingchu-1/` | the original's own alpha, levelled 120..205 so the fade baked into the front foot becomes opaque | Jingchu Humanoid, JingChu 1 manufacturer render |

Every visible pixel keeps the original's RGB at native resolution, with a 20 px transparent margin; nothing is enlarged or generated. The batch was checked with `ops/media/robots/review-intake.py` (11/11). The flat-background warnings on VB-01 point at the robot's own white arm. `contact-sheet-light-dark.jpg` shows the ten on light and dark grounds.

Notes for review:
- JingChu 1's sole reaches the bottom of the publisher's file only with its faint antialiased edge (alpha at most 131 in the last row).
- TianGong Omni's figure starts exactly at x = 850 of the original; column 849 is empty, so the thumb is whole.

## Left out (prepared, kept as research)

- **IGRIS 2025 (79)** `robros-igris-2025/`: the prototype hangs on a crane. A strap passes in front of the shoulder, and the crane post and base frame meet the hand and feet. It cannot be isolated by alpha alone and is not reconstructed (Codex, 27 Nov 2026).

Also examined by Codex and not used: R-Noid frame 908 (a pillar hides the back of the base) and the D9 section-2 frames (the light backgrounds cut the head or a cleaner hides the legs). Jingchu Elf (183) is held for the next batch, because its head reaches the top of the file with opaque pixels.

Sources: Codex's `candidates-19` (639618b), `candidates-20` (33e84f4), `candidates-21` (4d699a5), `candidates-22` (8417c21), `candidates-23` (b09a967) and `candidates-24` (421cfc1) on `codex/image-sources-remaining`, copied selectively.
