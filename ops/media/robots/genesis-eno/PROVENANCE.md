# Eno (Genesis): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Genesis AI's. No open licence is presumed. The site credits it as "Image: Genesis AI".
- **Page:** https://www.genesis.ai/press/meet-eno
- **File:** https://www.datocms-assets.com/199265/1781540929-genesis_fullbody_b_fhd_16x9.jpg
- **Context (Codex):** Eno complete headless wheeled platform as shown in manufacturer Meet Eno announcement (June16,2026), three-quarter view. No head or legs added.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/genesis-eno/`.
- **Original:** `original.jpg`, 1920 × 1080 px, RGB, 780,026 bytes, sha256 `2a99ac6a08f16880f6319ca1373ccfac0800642c9cf8a37b4ff74f943c7d916d` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha levels85..230; small isolated background components excluded; RGB unchanged. Review correction: diffuse halo around base/column removed by localized alpha threshold200 and0.45px antialias.); crop ROI [0, 0, 1920, 1080], alpha bounding box [735, 103, 1141, 991], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `a1562ce99828da62ccaa5275451d10ff3089c455edd6b95e281e334cde2ede26`) and the mask (sha256 `49f07a222d914c9925bef279950edf6e6cd1d37a887fba9a9068b368f91c95d5`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 117, Lab "Genesis", Robot "Eno".
- Eno as shown in Genesis AI's "Meet Eno" announcement (16 June 2026): the complete headless wheeled platform; no head or legs added.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 7, PR not yet merged)

- **PNG:** `assets/robots/genesis-eno/genesis-eno-full-body.png`, 446 × 928 px, sha256 `a1562ce99828da62ccaa5275451d10ff3089c455edd6b95e281e334cde2ede26` (= Codex's prepared.png).
- **WebP:** `assets/robots/genesis-eno/genesis-eno-full-body.webp`, sha256 `b31c6b6ad84be73700352a27d64e7160275d9c63261ceba971a1dc63148ffac1`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
