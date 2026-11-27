# GENE.01 (Generative Bionics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Generative Bionics's. No open licence is presumed. The site credits it as "Image: Generative Bionics".
- **Page:** https://news.gbionics.ai/?article=gene-01-comes-to-life&lang=en
- **File:** https://cms.gbionics.ai/uploads/GB_Gene01_Press_28599c665e.zip
- **Context (Codex):** July20,2026 GENE.01 platform, full studio photograph Media/1.jpg in the official July press kit. Not the CES concept, not a relabelled ergoCub. Original dark lighting retained. Alpha-only hand/hip boundary cleanup; no exposure, brightness, geometry or RGB edits to delivered image.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/gene-01/`.
- **Original:** `original.jpg`, 3840 × 2160 px, RGB, 393,116 bytes, sha256 `a5316f93d9f908c42fe8fa7249f31a58a5241f3ca9a462def9986f495fb18275` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small background components excluded; original RGB unchanged. Alpha-only manual exclusion of dark background fused to right hip; original wrist/hand pixels preserved. Brightened diagnostic was used only to trace the alpha boundary; delivered RGB is unchanged. Right-hand alpha outline traced from original; rectangular background at hand excluded. Background gap between right arm and torso traced with alpha-only polygon. Review correction: partial-alpha background at left hand and crotch removed, preserving opaque source body and1px edge.); crop ROI [0, 0, 3840, 2160], alpha bounding box [1547, 222, 2264, 2081], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `0d89a112a38386ca13a7dace20d59dbc84bc02f68e3d75b08af57652636500db`) and the mask (sha256 `fb58974c3b3fee62381a3e3ca4eaf647220e6436671dfc1e0a525e46b626badf`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 36, Lab "Generative Bionics", Robot "GENE.01".
- GENE.01 as announced on 20 July 2026: studio photograph Media/1.jpg (3840 × 2160) from the official press kit GB_Gene01_Press_28599c665e.zip (sha256 8d900899ca8d97aabd39995398a02d9c6272b6bf8fea5a26c80c8f07867aa4e6), linked from the official news page. Not the CES 2026 concept. The original dark lighting is kept; the hand, hip and crotch edges were traced by Codex in alpha only.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 7, PR not yet merged)

- **PNG:** `assets/robots/generative-bionics-gene-01/generative-bionics-gene-01-full-body.png`, 757 × 1899 px, sha256 `0d89a112a38386ca13a7dace20d59dbc84bc02f68e3d75b08af57652636500db` (= Codex's prepared.png).
- **WebP:** `assets/robots/generative-bionics-gene-01/generative-bionics-gene-01-full-body.webp`, sha256 `13b1f1893a714f1ac61093a06d23705e510c0fa15e540f320b16c0a9cab69965`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
