# T800 (Engineai): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** EngineAI's. No open licence is presumed. The site credits it as "Image: EngineAI".
- **Page:** https://www.engineai.com.cn/product-t800
- **File:** https://cn-engineai-1304599088.cos.ap-guangzhou.myqcloud.com/uploads/upload/images/20251129/5ab0cb5e6f8ecf879a1c31d3cd0886ff.jpg
- **Context (Codex):** T800 complete running pose from Chinese official product page. Both feet present. Configuration not attributed to Basic/Pro/Max without further proof.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 2daba0a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/engineai-t800/`.
- **Original:** `original.jpg`, 1400 × 833 px, RGB, 275,437 bytes, sha256 `a1e43baf54166865f5bf863c3d560308680d5e8e9d73c3da131fae16c060162d` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small background components removed. Alpha-only floor reflection exclusion below original row813.); crop ROI [0, 0, 1400, 833], alpha bounding box [740, 34, 1260, 813], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `c53129fcada5aa5f3ee7b0ea89c37ef922e016079a1c05cd4fd3bcd2e206d74e`) and the mask (sha256 `ebd04e839299220f6799dc78e0c6835ac09b7e3317bb0113021a19edb41ec81a`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 151, Lab "Engineai", Robot "T800".
- T800 from EngineAI's official Chinese product page, running pose with both feet. The record covers the Basic, Open Source, Pro and Max editions: no edition is claimed.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 6, PR 216, merge b24a276, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/engineai-t800/engineai-t800-full-body.png`, 560 × 819 px, sha256 `c53129fcada5aa5f3ee7b0ea89c37ef922e016079a1c05cd4fd3bcd2e206d74e` (= Codex's prepared.png).
- **WebP:** `assets/robots/engineai-t800/engineai-t800-full-body.webp`, sha256 `fa8d957f899ad05d82e993034687190b27f4d5f6f03cd95ca672d35aa4b0a8d0`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
