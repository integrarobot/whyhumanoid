# Robot image batch 11: published package

Published with PR 233 (reviewed head 2590573, CI 46045148477; merge e8e5f40, Pages 46046491073, 27 Nov 2026) and verified in production by Claude and Codex. `mapping.json` lists the ten integrated images; `manifest.json` holds their geometry, hashes and alpha method.

## Integrated (ten)

| Record | Folder | Cutout | Visible caption |
|---|---|---|---|
| 119 NORI A3 | `nori/` | BiRefNet mask of the original (`segmentation-birefnet-mask.png`) | Nori Robotics |
| 46 K-Bot | `kscale-kbot/` | BiRefNet mask | K-Scale Labs, K-Bot technical render |
| 210 NAVIAI WA2 | `naviai-wa2/` | BiRefNet mask | NAVIAI, WA2 manufacturer diagram |
| 3 aeo | `aeolus-aeo/` | the original's own alpha, levelled 20..250, specks removed | Aeolus Robotics |
| 78 AI Sapiens K0 | `robotis-k0/` | the original's own alpha, levelled 20..250, specks removed | ROBOTIS, AI Sapiens K0, cowboy-hat configuration |
| 53 QTrobot | `luxai-qtrobot/` | the original's own alpha | LuxAI, QTrobot render (record 53 keeps its name) |
| 68 PUDU D7 | `pudu-d7/` | BiRefNet mask | Pudu Robotics, D7 video still |
| 190 MATRIX-3 | `matrix-3/` | BiRefNet mask | Matrix Robotics, MATRIX-3 video poster |
| 131 Voxel Series-1 | `tuesday-voxel-series-1/` | BiRefNet mask, largest region kept | Tuesday Labs |
| 10 Astribot S1 | `astribot-s1/` | BiRefNet mask | Astribot, S1 video still |

Sources: Codex's `candidates-11` (7496b6e: NORI, K-Bot, WA2) and `candidates-12` (864fcbc: aeo, K0, QTrobot, D7, MATRIX-3, Voxel Series-1, S1) on `codex/image-sources-remaining`, copied selectively. Every cutout was prepared by Claude, alpha only: every visible pixel keeps the original's RGB at native resolution, with a 20 px transparent margin. Checked with `ops/media/robots/review-intake.py` (10/10). `contact-sheet-light-dark.jpg` shows the ten on light and dark grounds.

## Not integrated

- **VB1 (188) and TianYi 2.0 (205):** annotation dots are painted on the body.
- **NAVIAI i3 (209):** the robots in the large drawing overlap; the separate running figure is too small.
- **PR-OMNI (194):** the robot's lifting column cannot be told from a warehouse post behind it.
- **Jupiter (208):** the hand and the umbrella merge with a person, and the feet reach the frame edge.
- **Calvin-40 (97) and Zerith H1 (207):** moved to batch 10.
- **Vibe 01 (118), Noble Machines platform (107) and ROBOTO Origin (128):** prepared and held for batch 12.
