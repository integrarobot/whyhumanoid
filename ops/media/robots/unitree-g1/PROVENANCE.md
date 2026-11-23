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

Matte levels 0.35 to 0.9: interior alpha set to opaque, soft edge tightened. The result is kept here as `unitree-g1-refined-not-published.png`.

- **Recipe:** `python3 ops/media/robots/refine.py unitree-g1-codex-cutout-as-received.png out.png <args>`, with the args in `refine-args.txt`.
- **Log:** `refine-log.json`.
- **What it does not do:** no robot pixel is repainted, nothing is generated, and no colour threshold is applied to the whole image.

## Not published: no catalogue identity

Unitree G1 is not a row of the published catalogue (snapshot of 17 Nov 2026), so there is no robot page to attach the image to.

- **In the current master (23 Nov):** it appears as row 141 (Unitree | G1), which has not been reviewed or published yet.
- **Same name, other makers:** "G1" is also the name of a Galbot robot (catalogue id 35) and of an Agibot one.
- **Not a substitute for H1:** the image must not go on the H1 page.

Activate it in `tools/robot-presentation.json` only once Unitree G1 has its own catalogue id. The entry is then checked against Lab "Unitree" and Robot "G1".
