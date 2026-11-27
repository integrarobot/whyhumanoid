# pib (Pib): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** pib's. No open licence is presumed. The site credits it as "Image: pib, pib#5".
- **Page:** https://pib.rocks/press/
- **File:** https://pib.rocks/wp-content/uploads/2026/09/pib5-Rocks.png
- **Context (Codex):** Official press section explicitly labels pib#5. Complete bench/stand-based upper-body robot, its base and both hands; this platform has no legs to invent. Check right fingertips are complete and alpha-only remove white background. Generic pib catalogue; name pib#5 shown.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 299a0d7); kept in `ops/media/intake-remaining-2026-11-27/batch-08/pib-5/`.
- **Original:** `original.png`, 1920 × 2006 px, P, 409,604 bytes, sha256 `80468486d9b6a24b4b664d0570ac82a6941cdc371096387dbd7f7a2389ce80cc` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (original alpha); crop ROI [0, 0, 1920, 2006], alpha bounding box [131, 93, 1644, 1984], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `7e1e0d6ed2869e37224453b103a52f0a057113a0eb3a7d8a63502d8764abf02a`, mask sha256 `5aa2ba1ef2b9577f36f448e627e7c03512357b4d371d6f4961232c6126599242`.

## Catalogue identity

- **Record:** catalogue id 65, Lab "Pib", Robot "pib".
- pib's official press page labels this image pib#5. pib is an upper-body robot on a stand with no legs by design; the whole robot, its stand and both hands are shown. The catalogue record is pib, a printable platform of variable configuration; the image is named pib#5.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 8, PR 228, merge db579f7, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/pib-5/pib-5-full-body.png`, 1553 × 1931 px, sha256 `7e1e0d6ed2869e37224453b103a52f0a057113a0eb3a7d8a63502d8764abf02a` (= the prepared.png).
- **WebP:** `assets/robots/pib-5/pib-5-full-body.webp`, sha256 `18c676319d6b69c84fbaa366ceea358a375654ca253f952ebf2b7b5b4730e162`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
