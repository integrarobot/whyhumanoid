# Digit 5 (Agility Robotics): full-body image, provenance and refinement

Not published: `ops/` is excluded from the site. The published files are in `assets/robots/agility-digit-5/`.

## Source

- **Image:** the Digit 5 profile image. It is Agility Robotics's image, and no open licence is presumed. The site credits it as "Image: Agility Robotics".
- **Page:** https://www.agilityrobotics.com/solutions/digit-5
- **File:** https://cdn.prod.website-files.com/68d6ca150ffa11fdc25d7575/698c88da0a3bf08e257409ea_80ed2951470859371c4f50dec21751bd_digit-profile.jpg
- **Original:** not kept here. The session's network policy refused this host (HTTP 403 at the proxy, 23 Nov 2026), so it could not be downloaded. Codex holds it from the batch.
  - **Pending:** add it to this folder next to the cutout.

## Cutout received (Codex, 23 Nov 2026)

- **File:** `digit-5-codex-cutout-as-received.png`, kept unmodified.
- **Format:** 554 × 943 px, RGBA with real alpha.
- **sha256:** `fa55d49d9c631a680b17c3a6be27d47131cd97b7d9d9dcfa3bffde53c4ae2d94`
- **How it was made:** cut out locally with rembg u2net. No paid API and no image generation were used.

## Refinement here (alpha only)

Matte levels 0.35 to 0.9: crisper edges, interior alpha set to opaque. The delivered cutout was otherwise clean.

- **Recipe:** `python3 ops/media/robots/refine.py digit-5-codex-cutout-as-received.png out.png <args>`, with the args in `refine-args.txt`.
- **Log:** `refine-log.json`.
- **What it does not do:** no robot pixel is repainted, nothing is generated, and no colour threshold is applied to the whole image.

## Published files

- **Size:** 501 × 889 px.
- **Formats:** WebP with alpha (quality 90, alpha lossless), plus a lossless PNG fallback.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
