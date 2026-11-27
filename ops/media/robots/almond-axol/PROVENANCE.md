# Axol (Almond): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 3, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** Almond's. No open licence is presumed. The site credits it as "Image: Almond".
- **Page:** https://www.almond.bot/
- **File:** https://www.almond.bot/assets/axol.webp
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit eece0f8) and kept in `ops/media/intake-ab-2026-11-27/batch-03/almond-axol/`.
- **Original:** `original.webp`, 900 × 900 px, RGBA, 20,256 bytes, sha256 `c048ec486f46c4897151dbb3fe6b856786a5501d2d2810f371e5f0cf780d1dcb` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding). Files `mask.png` and `prepared.png` (sha256 `bf7f76f87b9ccaee9b1df388e51ca936bf412260ebeb47eb7a8e272a6575d3d0`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 116, Lab "Almond", Robot "Axol".
- Bimanual Axol: the two-arm module as Almond presents it. The record says arms for table or cart with an optional Jelly Mobile base: no head, body or base is added or suggested.

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-03/almond-axol/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; no scaling.

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 3, PR not yet merged)

- **PNG:** `assets/robots/almond-axol/almond-axol-full-body.png`, 487 × 824 px, lossless, sha256 `b82a8f0bfd47bf8fcff189a7ec61be60e759a57526ae09645976115d64ba41b2`.
- **WebP:** `assets/robots/almond-axol/almond-axol-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `4d7d5b66a40e9d576d868e06a5be70467f21c07f08a20a9bf6131c639004e7c5`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
