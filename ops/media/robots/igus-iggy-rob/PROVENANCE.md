# Iggy Rob (Igus): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** igus's. No open licence is presumed. The site credits it as "Image: igus".
- **Page:** https://www.igus.com/automation/news/humanoid-robot
- **File:** https://igus.widen.net/content/vx4ay9rleh/webp/LCA_GEN_Humanoid_robot_News_DE_1.jpeg
- **Context (Codex):** Official Iggy Rob news illustration contains TWO robots; use only full LEFT robot with tray, glass and bottle; isolate from right cropped robot/crate. Do not cut tray. Source1018x688; useful body height ~650px, native.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 299a0d7); kept in `ops/media/intake-remaining-2026-11-27/batch-08/igus-iggy-rob/`.
- **Original:** `original.jpeg`, 1018 × 688 px, RGB, 33,418 bytes, sha256 `b07850efc9d1e90eaa94cd0022267996ca5946519d4fab97f13a17f4832ad30e` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (birefnet-general mask (rembg, mask only); levels 85..230; largest region kept); crop ROI [0, 0, 515, 688], alpha bounding box [38, 30, 512, 677], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `e1fc0b7c95e6b4a7734d82f67a0ebfd09d899102ae002897c7c582d80c6fce1d`, mask sha256 `f319b7e7ce68e84a2fcb8e7bbd19394d6a71ad780c727af8fbe785549e8ba58f`.

## Catalogue identity

- **Record:** catalogue id 42, Lab "Igus", Robot "Iggy Rob".
- From igus's humanoid-robot news illustration, which shows two Iggy Rob units; only the left robot, with its tray, bottle and glasses, is kept. The right robot and its crate are removed by the alpha mask only (largest region kept).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

- **Quality:** Small source: 514 × 687 px as prepared, from a 1018 × 688 illustration.

## Files integrated (image batch 8, PR not yet merged)

- **PNG:** `assets/robots/igus-iggy-rob/igus-iggy-rob-full-body.png`, 514 × 687 px, sha256 `e1fc0b7c95e6b4a7734d82f67a0ebfd09d899102ae002897c7c582d80c6fce1d` (= the prepared.png).
- **WebP:** `assets/robots/igus-iggy-rob/igus-iggy-rob-full-body.webp`, sha256 `68af6a88dd330ffb8c783f594fd7090bea4150118fc1748c4cb9352f19be6eea`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
