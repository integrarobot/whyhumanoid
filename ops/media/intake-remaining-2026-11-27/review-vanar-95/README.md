# Review package: Vanar Generation 1 (record 95), candidate for batch 16

Not integrated and not part of any product batch yet. Source: Codex's `candidates-39` (e0d60a7) on `codex/image-sources-remaining`: the Generation 1 render on Vanar Robots' page (native 6675 × 4702, `original.webp`, SHA-256 in `source.json` and `prepare.json`).

## Files

- `original.webp`, `source.json`: as transported by Codex.
- `segmentation-birefnet-mask.png`: BiRefNet general (rembg, mask only) on the region x 2550..4100, y 800..3960 of the original.
- `segmentation-birefnet-keyed-mask.png`: the same mask after the alpha-only correction below; the cutout uses this one.
- `prepared.png`, `mask-roi.png`, `prepare.json`: `prepare-cutout.py --roi 2550 800 4100 3960 --mask-file segmentation-birefnet-keyed-mask.png --keep largest` (levels 85..230). Native RGB, 20 px margin, 1182 × 2969.
- `review-light-dark.png`: the cutout on light and dark grounds.
- `review-rectangles-on-original.png`: the original (crop x 2545..4105, y 795..3965) with the six corrected rectangles in magenta and the four remaining flat-background warnings in cyan.

## Interpretive correction (to be reviewed against the original)

The studio background is a flat grey of exactly 52 (R = G = B, standard deviation about 0.4). BiRefNet left that grey opaque in several openings of the body and opened only part of one of them (right knee). Inside six rectangles (original coordinates), the alpha is lowered, never raised, by the distance to grey 52: transparent at a distance of 6 or less, kept at 16 or more, linear between. The black actuators (about 2) and the grey frames (about 100) are far from 52 and are untouched; the RGB is never changed.

| Rectangle (x0, y0, x1, y1) | Place |
|---|---|
| 3045, 2398, 3218, 2466 | interior of the left hip U bracket |
| 3436, 2398, 3647, 2466 | interior of the right hip U bracket |
| 3039, 3113, 3240, 3203 | interior of the left knee U bracket |
| 3430, 3113, 3647, 3203 | interior of the right knee U bracket (BiRefNet had opened part of it) |
| 2815, 1973, 2934, 2020 | gap between forearm bracket and actuator, left elbow, continuing the background BiRefNet already removed |
| 3766, 1973, 3860, 2011 | same, right elbow |

Why they are read as openings: thousands of pixels at exactly the background value with no gradient, which a lit surface in this render does not show, bounded by the U frame or continuous with background the model already removed. A first pass over every flat-52 region also emptied a 705 px patch on the shaded lower face of the left knee bracket, which is a real surface; that pass was dropped and the correction limited to these six rectangles.

Left opaque, as review-intake flags (flat-background warnings, not failures): two narrow slots at the hip (x 3412..3433 and 3237..3257, y 2229..2260), x 2922..2936, y 2113..2200, and x 3414..3458, y 2532..2563 (346 to 432 px each). Whether they are gaps or surfaces cannot be told from the pixels.

`review-intake.py` on this item: OK, with those four warnings.
