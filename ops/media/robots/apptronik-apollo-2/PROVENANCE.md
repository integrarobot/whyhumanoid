# Apollo 2 (Apptronik): full-body image, provenance and refinement

Not published: `ops/` is excluded from the site. The published files are in `assets/robots/apptronik-apollo-2/`.

## Source

- **Image:** the bipedal robot on the left of a studio render referenced from the page CSS. It is Apptronik's image, and no open licence is presumed. The site credits it as "Image: Apptronik".
- **Page:** https://apptronik.com/apollo/apollo-2
- **File:** https://cdn.prod.website-files.com/6a0dd86942776facbc2f6ba4/6a344342b0008298422e82a4_Studio%20Render%20Pose1%20Center%20Mobile.jpg
- **Original:** not kept here. The session's network policy refused this host (HTTP 403 at the proxy, 23 Nov 2026), so it could not be downloaded. Codex holds it from the batch.
  - **Pending:** add it to this folder next to the cutout.

## Cutout received (Codex, 23 Nov 2026)

- **File:** `apollo-2-codex-cutout-as-received.png`, kept unmodified.
- **Format:** 649 × 1600 px, RGBA with real alpha.
- **sha256:** `e172bcc31f9af9714e14be61b23c2a55df81c95a4fae0cc3d3f83421d0630013`
- **How it was made:** cut out locally with rembg u2net. No paid API and no image generation were used.

## Refinement here (alpha only)

Matte levels 0.35 to 0.9, edge colour un-premultiplied. The delivered cutout kept the grey studio background opaque between the thighs and between each arm and the torso (enclosed, so a flood from outside could not reach it); those three regions are cleared by bounded flat-grey region growing (boxes and seeds in refine-args.txt), and the 2 px edge beside them is un-mixed. The light "window" inside the pelvis frame is left as is: it may be a part of the robot.

- **Recipe:** `python3 ops/media/robots/refine.py apollo-2-codex-cutout-as-received.png out.png <args>`, with the args in `refine-args.txt`.
- **Log:** `refine-log.json`.
- **What it does not do:** no robot pixel is repainted, nothing is generated, and no colour threshold is applied to the whole image.

## Published files

- **Size:** 438 × 1200 px.
- **Formats:** WebP with alpha (quality 90, alpha lossless), plus a lossless PNG fallback.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
