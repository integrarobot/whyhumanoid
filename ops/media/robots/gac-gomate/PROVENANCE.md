# GoMate (GAC Group): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** GAC Group via Gasgoo Auto News's. No open licence is presumed. The site credits it as "Image: GAC Group, GoMate manufacturer product render (2024), video still via Gasgoo Auto News".
- **Page:** https://autonews.gasgoo.com/articles/video/70035551
- **File:** https://www.youtube.com/watch?v=LIfXrjzm0AA
- **Context (Codex):** Gasgoo editorial video explicitly labels Credit:GACGroup on screen. Last native frame shows whole single original2024GoMate manufacturer product render, head, both actual articulated hands, all wheel-leg assemblies intact, generous margins, no subtitles crossing body. This is NOT the2025/2026GoMateMini. Corroboration of exact2024robot identity from GAC official launch2024-12-27 baseid18961 and annual2024report. Alpha only; remove grey studio and floor/shadow, keep source RGB, exact native1920x1080. Mandatory caption GACGroup, GoMate manufacturer product render (2024), video still via GasgooAutoNews. Nativebody~850px high meetsminimum; earlier annualreportembeddedphoto under500was rejected, not upscaled. Do not copy specifications/performanceclaims or infer hardwaredeployment from render.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41), 1c2c9a0 (candidates-42) and efea6c9 (candidates-43)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/gac-gomate-2024-product-render/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 347,873 bytes, sha256 `3dbbe9eb1bbe9e89198ec78c226ef4eb5958fada6994a1f9aa6ddff534503e20` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240); crop ROI [720, 70, 1200, 1010], alpha bounding box [53, 37, 423, 886], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `ab182d2159849a1fcc54679730a35c15df84df089356b5a7e9f1af8ce28b65c3`, mask sha256 `128459b84b4360812985526f34970943192e012f4e784f7542e4060bca4d74ff`.

## Catalogue identity

- **Record:** catalogue id 33, Lab "GAC Group", Robot "GoMate".
- Frame 1142 of Gasgoo Auto News' video of 27 December 2024, at its native 1920 × 1080, which credits GAC Group on screen: the maker's render of the original 2024 GoMate, whole, with head, both articulated hands and all its wheel-leg assemblies. The grey studio and the shadow are excluded by the alpha mask. It is the 2024 GoMate, not the later GoMate Mini.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 16, PR 251, merge 43d8984, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/gac-gomate/gac-gomate-full-body.png`, 410 × 889 px, sha256 `ab182d2159849a1fcc54679730a35c15df84df089356b5a7e9f1af8ce28b65c3` (= the prepared.png).
- **WebP:** `assets/robots/gac-gomate/gac-gomate-full-body.webp`, sha256 `6638df883408588db9b6d05d84fad3c58d838d3ab06a72700cd518bbbf576477`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
