# Proxie (Cobot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 5, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Cobot's. No open licence is presumed. The site credits it as "Image: Cobot".
- **Page:** https://www.co.bot/
- **File:** https://cdn.sanity.io/images/3qpw73bq/yellow/35a24ba9acf5df1582187b7e6837a18f2de02f0b-2160x3840.jpg
- **Context:** Current manufacturer homepage main vertical photograph of complete Proxie mobile platform, seen from above; manufacturer family record, not assertion that this configuration has Gen2 bimanual arms.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit cc1923c) and kept in `ops/media/intake-cd-2026-11-27/batch-05/proxie/`.
- **Original:** `original.jpg`, 2160 × 3840 px, RGB, 660,996 bytes, sha256 `2aab9ba4ffa816a93795145424ba116cf93d52e70f76d94ec563fcd7a5cfda68` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha-only polygon excludes ground shadow and floor stripe); crop ROI [0, 0, 2160, 3840], alpha bounding box [489, 736, 1712, 2961], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `270de8f681e107ac3ed40af3fc60dbdf0f17980c7dfe83236286dac31772fcfe`) and the mask, reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 19, Lab "Cobot", Robot "Proxie".
- The main vertical photograph of the current Cobot homepage, the whole Proxie mobile platform seen from above. The record is the Proxie family; no claim that this configuration is the second generation or has the optional bimanual arms. Codex excluded the ground shadow and a floor stripe with an alpha-only polygon.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 5, PR 212, merge c1f79be, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/cobot-proxie/cobot-proxie-full-body.png`, 1263 × 2265 px, sha256 `270de8f681e107ac3ed40af3fc60dbdf0f17980c7dfe83236286dac31772fcfe` (= Codex's prepared.png).
- **WebP:** `assets/robots/cobot-proxie/cobot-proxie-full-body.webp`, sha256 `63d78b9944a708e2626f27847a310322f18306a14ae5cc757ce7f993855e6a96`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
