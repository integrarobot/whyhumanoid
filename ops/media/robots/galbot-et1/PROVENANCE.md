# ET1 (Galbot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 7, alphabetical after E/F (Javier, "venga sigue con 10 más", 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Galbot's. No open licence is presumed. The site credits it as "Image: Galbot".
- **Page:** http://www.galbot.com/et1/
- **File:** https://oss-cn-beijing.galbot.com/online/portal/website/posters/et1-spec-robot-v3.webp
- **Context (Codex):** ET1 entertainment humanoid complete product render from official ET1 page. No Standard/Pro/Flagship edition asserted.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-07` (commit 8133830) and kept in `ops/media/intake-07-2026-11-27/batch-07/galbot-et1/`.
- **Original:** `original.webp`, 900 × 1500 px, RGBA, 53,466 bytes, sha256 `b3fb106a6aefd6d47f1284c838720fae3506418786f2fe47a7ee18b66ea97365` (equal to Codex's manifest).
- **Codex's preparation:** original with its own transparency; non-generative alpha mask (Alpha levels85..230; small isolated background components excluded; RGB unchanged.); crop ROI [0, 0, 900, 1500], alpha bounding box [200, 175, 701, 1358], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `25a714b8fcef3651086f8802f19468b2494f68dc190215b9a4f5f783b7e936c4`) and the mask (sha256 `470d7b9890dad790373232e03eb8575f4a6ce495bcab731ce0aa951ce908a0a1`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 158, Lab "Galbot", Robot "ET1".
- ET1 entertainment humanoid, complete product render from Galbot's official ET1 page. The record covers the Standard, Pro and Flagship editions: no edition is claimed.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 7, PR not yet merged)

- **PNG:** `assets/robots/galbot-et1/galbot-et1-full-body.png`, 541 × 1223 px, sha256 `25a714b8fcef3651086f8802f19468b2494f68dc190215b9a4f5f783b7e936c4` (= Codex's prepared.png).
- **WebP:** `assets/robots/galbot-et1/galbot-et1-full-body.webp`, sha256 `63310b268494770ec2e61e6992394c95db6e4874cd15371e0cacf9452beac86c`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
