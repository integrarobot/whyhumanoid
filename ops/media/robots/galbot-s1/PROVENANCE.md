# S1 (Galbot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Galbot's. No open licence is presumed. The site credits it as "Image: Galbot".
- **Page:** http://www.galbot.com/s1/
- **File:** http://www.galbot.com/_nuxt/s1-spec-robot-v2.BSvgtlns.webp
- **Context (Codex):** S1 industrial wheeled dual-arm robot from S1 specification illustration. Not the G1 record.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/galbot-s1/`.
- **Original:** `original.webp`, 900 × 1506 px, RGBA, 66,516 bytes, sha256 `4d7ce6bb8a1615f4599a53954e0a15cea70c28b987180b5831b85054fba4c1c9` (equal to Codex's manifest).
- **Codex's preparation:** original with its own transparency; non-generative alpha mask (Alpha levels85..230; small isolated background components excluded; RGB unchanged.); crop ROI [0, 0, 900, 1506], alpha bounding box [81, 287, 725, 1291], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `e11ed48c5ea906fbe8c818026c379d6d936c07e302bd9d97cab5e11bb8a4f928`) and the mask (sha256 `3fe54533e805e55e0794297587e9b724fa755e15dc4e0e161d62ad50c6480132`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 157, Lab "Galbot", Robot "S1".
- S1 from the specification illustration on Galbot's official S1 page: the industrial wheeled two-arm robot. Not the G1 record (the G1 page's only complete image is labelled by its own alt text as a placeholder S1 render, so it is not used for G1).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 7, PR not yet merged)

- **PNG:** `assets/robots/galbot-s1/galbot-s1-full-body.png`, 684 × 1044 px, sha256 `e11ed48c5ea906fbe8c818026c379d6d936c07e302bd9d97cab5e11bb8a4f928` (= Codex's prepared.png).
- **WebP:** `assets/robots/galbot-s1/galbot-s1-full-body.webp`, sha256 `130f479ae5e91eeda67c3a85ddd1292467abc3c13edf0ea1dfd93a8baa10a927`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
