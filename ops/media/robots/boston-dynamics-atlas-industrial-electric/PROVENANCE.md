# Atlas (industrial electric) (Boston Dynamics): full-body image, provenance and refinement

Not published from here: `ops/` is excluded from the site.

## Source

- **Image:** Boston Dynamics's, chosen by Codex for the image batch Javier authorised on 23 Nov 2026. No open licence is presumed. The site credits it as "Image: Boston Dynamics".
- **Page:** https://bostondynamics.com/products/atlas/
- **File:** https://bostondynamics.com/wp-content/uploads/2026/01/atlas-spec-sheet.pdf (page 1: the embedded image x40 with its own alpha mask)
- **Original:** not kept here.
  - This session's network policy refuses outside image hosts (HTTP 403 at the proxy, 23 Nov 2026).
  - Codex keeps the originals and scripts in its local folders `work/robot-images-2026-11-23` and `outputs/robot-images-2026-11-23`, which are not mounted in the cloud.
  - **Pending:** add the original here.

## Cutout received (Codex, 23 Nov 2026)

- **File:** `atlas-industrial-electric-codex-cutout-as-received.png`, kept unmodified.
- **Format:** 338 × 892 px, RGBA with real alpha.
- **sha256:** `146f725d44b66cc97a0af89282f4a82ab896e3e88f269bc252bb0898be5f608c`
- **How it was made:** locally, from the alpha mask embedded in the PDF itself, not a segmentation model. No paid API and no image generation were used. Codex reviewed it on #101416 and #eeeeee.

## Refinement here (alpha only)

Alpha unchanged (levels 0 to 1); 31 isolated speck pixels (islands under 0.2 % of the robot) removed, and the transparent margin trimmed. Interior already fully opaque.

- **Recipe:** `python3 ops/media/robots/refine.py atlas-industrial-electric-codex-cutout-as-received.png out.png <args>`, with the args in `refine-args.txt`.
- **Log:** `refine-log.json`.
- **What it does not do:** no robot pixel is repainted, nothing is generated, and no colour threshold is applied to the whole image.

## Published files

- **Location:** `assets/robots/boston-dynamics-atlas-industrial-electric/`.
- **Size:** 292 × 846 px.
- **Formats:** WebP with alpha (quality 90, alpha lossless), plus a lossless PNG fallback.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
