# ROBOTO 01 / ROBOTO Origin (RoboParty): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** RoboParty's. No open licence is presumed. The site credits it as "Image: RoboParty, ROBOTO Origin repository render".
- **Page:** https://github.com/Roboparty/roboto_origin/blob/main/assets/1280X1280.PNG
- **File:** https://raw.githubusercontent.com/Roboparty/roboto_origin/main/assets/1280X1280.PNG
- **Context (Codex):** Official Roboparty GitHub organisation links from manufacturer site; repository roboto_origin, existing assets/1280X1280.PNG manufacturer render1280square. Whole walking figure, both complete feet/head and two round end-effector forms by design. Caption ROBOTO Origin repository render / ROBOTO family, not newly rendered URDF and not inferred ROBOTO01 capabilities. Catalogue explicitly allows ROBOTO01 / ROBOTOOrigin family. Prefer this large source to previous homepage stair image with small native figure. Exclude logo and floor shadow using mask only.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/roboparty-roboto-origin/`.
- **Original:** `original.png`, 1280 × 1280 px, RGB, 498,954 bytes, sha256 `887bfa7f18a42f8224a774924aa75c021192a57a5e7a20cffb2efca8680a9310` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [100, 0, 820, 1280], alpha bounding box [98, 169, 616, 1133], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `31394db5689fbe350fd345983ba2baeffd9ce8f07721dcd786a68fc155c2c0d4`, mask sha256 `321b0bbca21ff3e2cf9dbe9b04dc48785ffaef5a56494949b3b2ed8d81323fa7`.

## Catalogue identity

- **Record:** catalogue id 128, Lab "RoboParty", Robot "ROBOTO 01 / ROBOTO Origin".
- The 1280 × 1280 render in RoboParty's official roboto_origin repository, linked from the maker's site (an existing render, not a new one): the whole walking figure with head, both feet and its two round end-effectors by design. The logo and floor shadow are excluded by the alpha mask. The record covers the ROBOTO 01 / ROBOTO Origin family; no ROBOTO 01 capability is inferred from it.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 12, PR 240, merge fa0b12c, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/roboparty-roboto-origin/roboparty-roboto-origin-full-body.png`, 558 × 1004 px, sha256 `31394db5689fbe350fd345983ba2baeffd9ce8f07721dcd786a68fc155c2c0d4` (= the prepared.png).
- **WebP:** `assets/robots/roboparty-roboto-origin/roboparty-roboto-origin-full-body.webp`, sha256 `cefc7593afdca40fed47a5137d83e662e40e57afbf5e6a5826b6d81dcbfeda68`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
