# H1 (Unitree): full-body image, provenance and refinement

Not published from here: `ops/` is excluded from the site.

## Source

- **Image:** Unitree's, chosen by Codex for the image batch Javier authorised on 23 Nov 2026. No open licence is presumed. The site credits it as "Image: Unitree".
- **Page:** https://shop.unitree.com/products/unitree-h1
- **File:** https://cdn.shopify.com/s/files/1/0620/4932/1193/files/2_fa366397-5fe1-488b-89e1-d3ca3fb0e754.jpg?v=1718359355
- **Original:** not kept here.
  - This session's network policy refuses outside image hosts (HTTP 403 at the proxy, 23 Nov 2026).
  - Codex keeps the originals and scripts in its local folders `work/robot-images-2026-11-23` and `outputs/robot-images-2026-11-23`, which are not mounted in the cloud.
  - **Pending:** add the original here.

## Cutout received (Codex, 23 Nov 2026)

- **File:** `unitree-h1-codex-cutout-as-received.png`, kept unmodified.
- **Format:** 273 × 528 px, RGBA with real alpha.
- **sha256:** `26001304da89aa400a1a01d58a00c3d5b3e3d081e61bf21cadcb0d0fbbc37b65`
- **How it was made:** locally, from rembg. No paid API and no image generation were used. Codex reviewed it on #101416 and #eeeeee.

## Refinement here (alpha only)

Matte levels 0.35 to 0.9: interior alpha set to opaque, soft edge tightened. The official image is small: 251 x 505 px after trimming, so a larger official still would display sharper on high-density screens.

- **Recipe:** `python3 ops/media/robots/refine.py unitree-h1-codex-cutout-as-received.png out.png <args>`, with the args in `refine-args.txt`.
- **Log:** `refine-log.json`.
- **What it does not do:** no robot pixel is repainted, nothing is generated, and no colour threshold is applied to the whole image.

## Published files

- **Location:** `assets/robots/unitree-h1/`.
- **Size:** 251 × 505 px.
- **Formats:** WebP with alpha (quality 90, alpha lossless), plus a lossless PNG fallback.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
