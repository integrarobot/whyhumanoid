# Optimus Gen 2 (Tesla): full-body image, provenance and refinement

Not published: `ops/` is excluded from the site. The published files are in `assets/robots/tesla-optimus-gen-2/`.

## Source

- **Image:** the image linked from the Tesla AI page. It is Tesla's image, and no open licence is presumed. The site credits it as "Image: Tesla".
- **Page:** https://www.tesla.com/en_ph/AI
- **File:** https://digitalassets.tesla.com/tesla-contents/image/upload/Tesla-Bot-AI.jpg
- **Original:** not kept here. The session's network policy refused this host (HTTP 403 at the proxy, 23 Nov 2026), so it could not be downloaded. Codex holds it from the batch.
  - **Pending:** add it to this folder next to the cutout.

## Cutout received (Codex, 23 Nov 2026)

- **File:** `optimus-gen-2-codex-cutout-as-received.png`, kept unmodified.
- **Format:** 471 × 1248 px, RGBA with real alpha.
- **sha256:** `ce13f73b94799e513b2c02fd4294f7c5577c109f259be4c8d71dd11a011ae8db`
- **How it was made:** cut out locally with rembg isnet. No paid API and no image generation were used.

## Refinement here (alpha only)

Matte levels 0.35 to 0.9 remove the semi-transparent shadow ("smoke") by the right hand and under the pelvis; interior alpha set to opaque.

- **Recipe:** `python3 ops/media/robots/refine.py optimus-gen-2-codex-cutout-as-received.png out.png <args>`, with the args in `refine-args.txt`.
- **Log:** `refine-log.json`.
- **What it does not do:** no robot pixel is repainted, nothing is generated, and no colour threshold is applied to the whole image.

## Published files

- **Size:** 396 × 1174 px.
- **Formats:** WebP with alpha (quality 90, alpha lossless), plus a lossless PNG fallback.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
