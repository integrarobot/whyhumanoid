# Figure 03 (Figure): full-body image, provenance and refinement

Not published: `ops/` is excluded from the site. The published files are in `assets/robots/figure-03/`.

## Source

- **Image:** a frame of the official reveal video at 21.067 s. It is Figure's image, and no open licence is presumed. The site credits it as "Image: Figure".
- **Page:** https://www.figure.ai/news/introducing-figure-03
- **File:** https://videos.ctfassets.net/qx5k8y1u9drj/2FsKoPhahw4jCqElCqxAJO/87e96ae171bf821df42ecd190a46e870/F03_Reveal_MP4_Compressed.mp4
- **Original:** not kept here. The session's network policy refused this host (HTTP 403 at the proxy, 23 Nov 2026), so it could not be downloaded. Codex holds it from the batch.
  - **Pending:** add it to this folder next to the cutout.

## Cutout received (Codex, 23 Nov 2026)

- **File:** `figure-03-codex-cutout-as-received.png`, kept unmodified.
- **Format:** 384 × 1253 px, RGBA with real alpha.
- **sha256:** `f05912022f0f526a1a5692c8f2a29b09b6e729bf638cbe16ce4049c5b1320ea8`
- **How it was made:** cut out locally with rembg u2net. No paid API and no image generation were used.

## Refinement here (alpha only)

Matte levels 0.6 to 0.95 remove the soft halo around head, shoulders and legs; edge colour un-premultiplied. The remaining softness is in the video frame itself: a still photo would be sharper.

- **Recipe:** `python3 ops/media/robots/refine.py figure-03-codex-cutout-as-received.png out.png <args>`, with the args in `refine-args.txt`.
- **Log:** `refine-log.json`.
- **What it does not do:** no robot pixel is repainted, nothing is generated, and no colour threshold is applied to the whole image.

## Published files

- **Size:** 294 × 1171 px.
- **Formats:** WebP with alpha (quality 90, alpha lossless), plus a lossless PNG fallback.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
