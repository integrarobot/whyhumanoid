# Robot image batch 15: integrated package

This batch is integrated in this PR and not yet published. `mapping.json` lists the five integrated images, the sources Codex has transported so far for this batch.

## Integrated (five)

| Record | Folder | Cutout | Visible caption |
|---|---|---|---|
| 166 Avatar Robotics | `avatar-mobile-profile/` | BiRefNet mask; tray and packets kept, rack and floor left out | Avatar Robotics, mobile lift-column configuration, official video still |
| 199 StarBot Astra | `starbot-astra/` | BiRefNet mask on the centre figure; Spark, Flex and the floor reflection left out | StarBot, Astra manufacturer product illustration |
| 200 StarBot Flex | `starbot-flex/` | BiRefNet mask on the right figure, plus the two black casters from the original luminance | StarBot, Flex manufacturer product illustration |
| 191 MATRIX-1 | `matrix-1-product-native/` | BiRefNet mask; the floor reflection under the soles cut at the contact line | Matrix Robotics, MATRIX-1 manufacturer product image |
| 74 TASKBOT SCOUT | `revobots-taskbot-scout/` | BiRefNet mask, levels 150..240 | REVOBOTS, TASKBOT SCOUT mobile configuration, official video still |

Every visible pixel keeps the original's RGB at native resolution, with a 20 px transparent margin; nothing is enlarged or generated. The batch was checked with `ops/media/robots/review-intake.py` (5/5). `contact-sheet-light-dark.jpg` shows the five on light, dark and magenta grounds.

Notes for review:
- Astra and Flex come from one manufacturer product illustration (native 1536 × 1024), not a photograph of hardware; the captions say so.
- Flex: the BiRefNet mask left the two black casters under the base partly transparent (left) or out (right). Inside two small rectangles around them (x 1182..1237, y 943..959 and x 1372..1425, y 932..944 of the original) the mask takes the larger of the model value and a luminance value (opaque below 20, none above 50). The right caster's mirror image in the floor starts at its narrowest row (y 944) and stays out, as does the grey contact shadow. The combined mask is `segmentation-birefnet-casters-mask.png`.
- MATRIX-1: the soles meet their own reflection in the glossy floor. The brightness profile under both shoes is mirror-symmetric about y = 1980 of the original, so every row from 1981 down is set to alpha 0.
- TASKBOT SCOUT: the sensor dome is transparent, so what shows through it is the street behind, as filmed (the RGB is never edited; the same choice as the translucent box of Noble Machines in batch 12). The small white nub at the left of the rear wheel is in the frame and is kept. The configuration has no arms or head and none are added.
- Avatar Robotics: the maker discloses no model name; the caption names only the configuration.

## Not in this batch

Jingchu Elf (183) still waits for another source (its head reaches the top of the file with opaque pixels). T230A (89), D9 (155), R-Noid (77) and IGRIS (79) stay out with the reasons given in batches 12 to 14.

Sources: Codex's `candidates-25` (66c596a), `candidates-26` (b07ffac), `candidates-27` (dc11021) and `candidates-28` (62f03ab) on `codex/image-sources-remaining`, copied selectively.
