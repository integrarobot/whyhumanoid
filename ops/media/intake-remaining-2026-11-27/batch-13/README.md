# Robot image batch 13: published package

Published with PR 242 (reviewed head 1f57dd5, CI 46053204219; merge c314f66, Pages 46053509647, 27 Nov 2026) and verified in production by Claude and Codex. `mapping.json` lists the ten integrated images; `manifest.json` also keeps one prepared candidate that was left out (T230A, below).

## Integrated (ten)

| Record | Folder | Cutout | Visible caption |
|---|---|---|---|
| 49 Kuavo 4Pro | `kuavo-4pro-articulated-hands/` | the original's own alpha | Leju, Kuavo 4Pro technical render with articulated hands |
| 186 ARMAR-7 | `kit-armar-7/` | the slide's own soft mask (`source-mask.png`) | KIT H²T, ARMAR-7, Robotics I lecture photograph |
| 187 XMAN-R1 | `keenon-xman-r1/` | BiRefNet mask | KEENON Robotics, XMAN-R1 manufacturer render |
| 104 IRON | `xpeng-iron-2026/` | BiRefNet mask on a region wide enough for the whole left hand | XPENG, IRON, September 2026 production-line photograph |
| 51 Oli | `limx-oli-hu-d04-hand/` | BiRefNet mask; title, hand-detail circle and floor halo left out | LimX Dynamics, Oli HU_D04 dexterous-hand configuration, technical render |
| 76 STAR1 | `robotera-star1-pdf/` | BiRefNet mask | ROBOTERA, STAR1 manufacturer brochure image |
| 54 MagicBot Gen1 | `magiclab-magicbot-gen1/` | BiRefNet mask | MagicLab, MagicBot Gen1 video still |
| 195 ProWhite 2.0 | `pl-universe-prowhite-2/` | BiRefNet mask | PL-Universe, ProWhite Robot 2.0 brochure image |
| 38 Sophia | `hanson-sophia-utility/` | the presentation's own soft mask, levelled 215..240 so its broad feathered edge and white fringe drop out | Hanson Robotics, Sophia Utility platform, skirted configuration |
| 73 Reflex | `reflex-snow-video/` | BiRefNet mask; the held snow shovel kept as its tool | Reflex, video still with snow shovel |

Every visible pixel keeps the original's RGB at native resolution, with a 20 px transparent margin; nothing is enlarged or generated. Checked with `ops/media/robots/review-intake.py` (11/11). `contact-sheet-light-dark.jpg` shows the ten on light and dark grounds.

Review notes: Sophia's cap reaches the top of the source file with only a faint antialiased row 0 (source mask at most 39); Codex accepted the contour, with no opaque geometry cut. The review warnings on Sophia are the skirt's real black folds, and those on ARMAR-7 and STAR1 are physical edges of the base and a hand. ARMAR-7 is a small native source (313 × 664 as prepared).

## Left out (prepared, kept as research)

- **T230A (89)** `ti5-t230a/`: the robot is explicitly labelled in the official Ti5 brochure lineup, but the brochure's white light beams behind it cannot be separated from its white body without artificial straight edges.

Sources: Codex's `candidates-14` (6d1eb96), `candidates-15` (54f4cf5), `candidates-16` (23aba3a), `candidates-17` (164cfaf), `candidates-18` (617be62) and `candidates-19` (639618b) on `codex/image-sources-remaining`, copied selectively.
