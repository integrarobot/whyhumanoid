# Laborer C1 (Glroad): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Glroad's. No open licence is presumed. The site credits it as "Image: Glroad".
- **Page:** https://www.glroad.com/HumanoidRobots/index.aspx
- **File:** https://www.glroad.com/uploadfiles/2026/10/20261015134446741.png?5Lqn5ZOB5Y2h54mHLUMxLnBuZw==
- **Context (Codex):** Laborer C1 identified by C1 product card in official Humanoid Robots catalogue. Full running-pose robot with both hands and feet. Not M1.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/glroad-laborer-c1/`.
- **Original:** `original.png`, 570 × 810 px, RGBA, 281,663 bytes, sha256 `a9b2f9f0dfab3a2e203762f5c962ea3147de515f75e051985eb45b8e2306b5c2` (equal to Codex's manifest).
- **Codex's preparation:** original with its own transparency; non-generative alpha mask (Alpha levels85..230; small isolated background components excluded; RGB unchanged.); crop ROI [0, 0, 570, 810], alpha bounding box [46, 19, 544, 789], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `b4f0b808ce1fb5879cf4406497dde5ec3483235c7f1358ccf1713e7be8017516`) and the mask (sha256 `1d8e0fe831c04893c827fc1521f6f22e978bc8e5da35a983f117966baef772e2`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 179, Lab "Glroad", Robot "Laborer C1".
- Laborer C1, identified by its C1 product card in Glroad's official humanoid robots catalogue; full running-pose robot with both hands and feet. Not the Laborer M1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 7, PR 225, merge 8b33837, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/glroad-laborer-c1/glroad-laborer-c1-full-body.png`, 538 × 810 px, sha256 `b4f0b808ce1fb5879cf4406497dde5ec3483235c7f1358ccf1713e7be8017516` (= Codex's prepared.png).
- **WebP:** `assets/robots/glroad-laborer-c1/glroad-laborer-c1-full-body.webp`, sha256 `3718079246d47f25d1e7ffc5ba4e8b1185d8b5c0ff165456902cb5dd0cbea5ab`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
