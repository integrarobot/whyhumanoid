# ugo Nova (ugo): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** ugo's. No open licence is presumed. The site credits it as "Image: ugo".
- **Page:** https://ugo.plus/ai/ugo-nova/
- **File:** https://ugo.plus/wp-content/uploads/2026/09/img_nova_spec.png
- **Context (Codex):** Official ugo Nova product page exact img_nova_spec.png in specification section. Complete wheeled platform with grippers and base. No human legs added.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/ugo-nova/`.
- **Original:** `original.png`, 588 × 1080 px, P, 80,605 bytes, sha256 `3b88f5cc1551a5aefdbb75da3d4ab12eb99dc135b969fdabf875838b60062354` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad); crop ROI [0, 0, 588, 1080], alpha bounding box [140, 223, 455, 1007], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `cbce470d3ceba895b49eabcded5f192655426e801fa74c36abfc95589a354be1`, mask sha256 `95d784b964bcd28e042b6a8b5481bca4633f3c3ce0f9252642edecefd2ea1f3b`.

## Catalogue identity

- **Record:** catalogue id 203, Lab "ugo", Robot "ugo Nova".
- ugo's ugo Nova product page, image img_nova_spec.png in the specification section: the complete wheeled platform with its grippers and base. The record is ugo Nova.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

- **Quality:** Small source: 355 × 824 px as prepared.

## Published files (image batch 9, PR 230, merge 98b6aa5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/ugo-nova/ugo-nova-full-body.png`, 355 × 824 px, sha256 `cbce470d3ceba895b49eabcded5f192655426e801fa74c36abfc95589a354be1` (= the prepared.png).
- **WebP:** `assets/robots/ugo-nova/ugo-nova-full-body.webp`, sha256 `431361918788516a991506041496569b56d9c6c7943a70c563e19cf97d16e86d`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
