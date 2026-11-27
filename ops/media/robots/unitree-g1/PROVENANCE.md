# G1 (Unitree): full-body image, provenance and refinement

Not published from here: `ops/` is excluded from the site.

## Source

- **Image:** Unitree's, chosen by Codex for the image batch Javier authorised on 23 Nov 2026. No open licence is presumed. The site credits it as "Image: Unitree".
- **Page:** https://shop.unitree.com/products/unitree-g1
- **File:** https://cdn.shopify.com/s/files/1/0620/4932/1193/files/1_968fd08b-9aaf-4f32-b895-5c786285ee52.jpg?v=1717575256
- **Original:** not kept here.
  - This session's network policy refuses outside image hosts (HTTP 403 at the proxy, 23 Nov 2026).
  - Codex keeps the originals and scripts in its local folders `work/robot-images-2026-11-23` and `outputs/robot-images-2026-11-23`, which are not mounted in the cloud.
  - **Pending:** add the original here.

## Cutout received (Codex, 23 Nov 2026)

- **File:** `unitree-g1-codex-cutout-as-received.png`, kept unmodified.
- **Format:** 331 × 808 px, RGBA with real alpha.
- **sha256:** `41ca0246d1ce13491d2c2cf74799ae4fa6e9336e660af619ea1efdb2a18e7a77`
- **How it was made:** locally, from rembg. No paid API and no image generation were used. Codex reviewed it on #101416 and #eeeeee.

## Refinement here (alpha only)

Matte levels 0.35 to 0.9: interior alpha set to opaque, soft edge tightened. Reproduced byte for byte on 27 Nov 2026.

- **Recipe:** `python3 ops/media/robots/refine.py unitree-g1-codex-cutout-as-received.png out.png <args>`, with the args in `refine-args.txt`.
- **Log:** `refine-log.json`.
- **What it does not do:** no robot pixel is repainted, nothing is generated, and no colour threshold is applied to the whole image.

## Catalogue identity (27 Nov 2026)

- **Record:** catalogue id 138, Lab "Unitree", Robot "G1" (master row 141), web unitree.com/g1/. The record covers G1 base and G1 EDU; G1-A, G1-D, G1+, G1-Comp and G1-Boxing are separate variants.
- **Visual check (Claude):** the visor with its LED ring, the silver torso marked "Unitree", the compact proportions and the whole body down to the feet match the G1.
- **Not these robots:** Galbot G1 (id 35) and Agibot G1 (id 147) are wheeled robots by other makers. The H1 page (id 93) keeps its own image.
- **Hands:** the right hand looks articulated. The alt text claims no hand configuration.

## Published files (image batch 1, pending review)

- **Location:** `assets/robots/unitree-g1/`.
- **PNG:** `unitree-g1-full-body.png`, 288 × 765 px, lossless, the refined file above (sha256 `66735252e54ca175eec0c61a086dc95711b94bc06722a6489b9d9b2a9ad66e0f`).
- **WebP:** `unitree-g1-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha), sha256 `bc6d84df56b32c424c105f6d23773adce1247351b545b6b4f2e76c46404f49a8`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit "Image: Unitree".
- **Still pending:** the original JPEG in this folder, and confirmation that the shop page still serves it. If Codex finds a faithful official G1 original that already carries transparency, it replaces this cutout.
