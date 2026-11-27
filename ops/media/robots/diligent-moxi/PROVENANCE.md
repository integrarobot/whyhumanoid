# Moxi (Diligent): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 4, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** Diligent Robotics's. No open licence is presumed. The site credits it as "Image: Diligent Robotics".
- **Page:** https://www.diligentrobots.com/moxi
- **File:** https://static1.squarespace.com/static/606f1bb0f7e05e3329035ff8/t/6ad002df1bb6e83f260d6a50/1792017119252/Diligent_Shannon_Health_Case_Study2.pdf
- **Extraction:** PDF page1 xref3, native1428x2000 image.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit a2f0241) and kept in `ops/media/intake-cd-2026-11-27/batch-04/moxi/`.
- **Original:** `original.png`, 1428 × 2000 px, RGB, 1,207,611 bytes, sha256 `e31dac3b64b5851f21cec735a7cf1a933c2cbfd613cb82e05359a3c2b7ce282c` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels 85 to230, small background components removed, black base restored using manual alpha polygon; source RGB unchanged.); crop ROI [0, 0, 1428, 2000], alpha bounding box [428, 350, 971, 1838], 20 px transparent padding; no RGB edit, no scaling. Files `mask-roi.png` and `prepared.png` (sha256 `476a24010ec9abafed9761da5a2d6f5fb193fdbb1896f6d4b981060e91fcaae9`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 23, Lab "Diligent", Robot "Moxi".
- Photograph extracted unmodified from Diligent's official Shannon Health case study PDF (page 1, image xref 3, 1428 × 2000; PDF sha256 8aafa5d3a17591ff0ffd9b60d0e30bb36b6220e56f3893134b24863280791b3a, kept outside Git), linked from diligentrobots.com/moxi. Codex restored the black Freight100 base with a manual alpha polygon after automatic segmentation dropped it; RGB unchanged.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 4, PR not yet merged)

- **PNG:** `assets/robots/diligent-moxi/diligent-moxi-full-body.png`, 583 × 1528 px, sha256 `476a24010ec9abafed9761da5a2d6f5fb193fdbb1896f6d4b981060e91fcaae9` (= Codex's prepared.png).
- **WebP:** `assets/robots/diligent-moxi/diligent-moxi-full-body.webp`, sha256 `2beb2b25aa663e2e4dab2dea8b8b77263b9bb7118446c3482177ebb848f4f739`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
