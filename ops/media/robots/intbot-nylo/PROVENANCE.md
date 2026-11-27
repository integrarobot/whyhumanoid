# Nylo (IntBot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** IntBot's. No open licence is presumed. The site credits it as "Image: IntBot".
- **Page:** https://intbot.ai
- **File:** https://intbot.ai/assets/nylo_fullbody.png
- **Context (Codex):** Official IntBot app JavaScript (index-jEtWzNKI.js) explicitly maps slug nylo, name Nylo, to /assets/nylo_fullbody.png. Other bots Kai/Nemi are separate. Native alpha, white clothes, whole body incl both feet.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 299a0d7); kept in `ops/media/intake-remaining-2026-11-27/batch-08/intbot-nylo/`.
- **Original:** `original.png`, 550 × 1378 px, RGBA, 845,487 bytes, sha256 `6bce217d68863ddf42a252bdc3824d342a861e044f54fcc07e2cec9a36c6a683` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (original alpha); crop ROI [0, 0, 550, 1378], alpha bounding box [47, 12, 505, 1364], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `3a419571e5b52624b506e572e9d9882fbff1cd574fd218ae8e93d875d6c28b8a`, mask sha256 `d0bc09641244e063d945f8ae640134540d9f6c0ae9859829b7565b47ca1d89a9`.

## Catalogue identity

- **Record:** catalogue id 45, Lab "IntBot", Robot "Nylo".
- IntBot's official app JavaScript maps the slug nylo, name Nylo, to /assets/nylo_fullbody.png; IntBot's other robots (Kai, Nemi) are separate. The catalogue record is Nylo.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 8, PR not yet merged)

- **PNG:** `assets/robots/intbot-nylo/intbot-nylo-full-body.png`, 498 × 1392 px, sha256 `3a419571e5b52624b506e572e9d9882fbff1cd574fd218ae8e93d875d6c28b8a` (= the prepared.png).
- **WebP:** `assets/robots/intbot-nylo/intbot-nylo-full-body.webp`, sha256 `ffd3b8d6f38577fa889fcc919d2dd55331887acbb83ed2ff8bb56b2772d642f9`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
