# Robot image batch 18: integrated package

This batch is integrated in this PR and not yet published. `mapping.json` lists the five integrated images: the valid sources of the final sweep. The records still without an image are not resolved by this batch.

## Integrated (five)

| Record | Folder | Cutout | Visible caption |
|---|---|---|---|
| 109 Khameleon | `khameleon-manufacturer-complete-platform/` | BiRefNet mask, levels 150..240; table and bin out, bottle kept | Khameleon, platform in task configuration with tools and bottle, manufacturer photograph |
| 62 Persona AI | `persona-ai-whole-prototype-native/` | BiRefNet mask, levels 150..240; ceiling duct behind the head out | Persona AI, full humanoid prototype, official video still (2026) |
| 125 Nucleus | `nucleus-official-service-platform-rear/` | BiRefNet mask, levels 150..240; shelf beam and box edge out, black cables kept | Nucleus, service platform shown in official video, rear view (2026) |
| 114 Eden | `eden-complete-native-demo-platform/` | BiRefNet mask, levels 150..240 | Eden Robotics, complete prototype platform on caster base, official demo still (2026) |
| 214 Techman TM Xplore I | `techman-tm-xplore-i-2025-product-animation/` | BiRefNet mask, levels 150..240 | Techman Robot, TM Xplore I product animation still (2025), via SSI |

Every visible pixel keeps the original's RGB at native resolution, with a 20 px transparent margin; nothing is enlarged or generated. The batch was checked with `ops/media/robots/review-intake.py` (5/5). `contact-sheet-light-dark.jpg` shows the five on light, dark and magenta grounds.

Notes for review (coordinates in each original):
- Khameleon: the clear bottle in the left gripper is kept; the round table below and the bin on the right are out. A dark slot under the right dispenser of the base (x 375..395, y 590..640) stays opaque: it has the colour of the robot's black parts and there is no clear evidence that it is background (Codex's rule: keep the ambiguous dark gap opaque).
- Persona AI: the model mask took in the ceiling duct that runs into the top of the head from behind; every pixel above y = 180 within x 900..1019 is set to alpha 0, where the grey top of the head begins (`segmentation-birefnet-no-duct-mask.png`).
- Nucleus: two background pieces the model took in are removed by alpha only: the light shelf beam between the left arm and the back (x up to 357, y 452..477, right of the arm edge) and the dark edge and orange stub of a box behind the right elbow (x 583..606, y 414..450, above the arm and away from the black cable). The black cables of both arms, the loop under the right wrist, the cables over the back and mast, and the white controller and cable on the base are kept (`segmentation-birefnet-background-removed-mask.png`). It is the platform Nucleus shows; no maker or model is claimed.
- Techman: the black hands and head are kept against the dark green studio; checked at native scale. It is a product animation, not 2026 hardware.
- Eden: the person and the black box beside the platform are out.

## Not in this batch

- **Rhoda (75)**, candidates-50 (69e22a1), the Mobile DVA thumbnail: the left gripper (x 580..635, y 410..512) sits inside a blue crate, partly hidden by its walls, and the official videos have subtitles over the base; Codex checked 480 native frames without a clean alternative. Rejected for occlusion and on-screen text; no fingers are completed and no files are kept.

Sources: Codex's `candidates-48` (5083e8a), `candidates-49` (2021f8c) and `candidates-51` (6f9b29e) on `codex/image-sources-remaining`, copied selectively.
