# Star 1 (Robotera): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** ROBOTERA's. No open licence is presumed. The site credits it as "Image: ROBOTERA, STAR1 manufacturer brochure image".
- **Page:** https://www.robotera.com/upload/goods/20241208/f56791f6bd7fdd069e2c8552f4d3aeed.pdf
- **File:** https://www.robotera.com/upload/goods/20241208/f56791f6bd7fdd069e2c8552f4d3aeed.pdf
- **Context (Codex):** OfficialSTAR1brochurePDFpage1embeddedrasterimage0, native2380x3368. WholefrontthreequarterSTAR1, completehelmet/handsfoldedtogether/twofeetwithmarginbelow. IsolateONLYfigureonright; exclude title,QRcontactblockandtexturednavybackground. Existingmanufacturerproductimage/render;caption STAR1manufacturerbrochureimage,notnewrender. Page2seatedalternateexistsbutprefercompletefrontstandingpage1.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/robotera-star1-pdf/`.
- **Original:** `original.png`, 2380 × 3368 px, RGB, 4,618,297 bytes, sha256 `1f78326fd3bada5d791b127d4421f69777c889187a3586b5a94e27f4f427afe1` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [1050, 100, 2380, 3368], alpha bounding box [157, 35, 1131, 3205], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `eeedc091fba6949ac12f73beb222088e78e5895b1cda8840732a963d4162390b`, mask sha256 `fd84053495e3f87621e507fd7b12d33e6a30aba372c249cb0104a25315eda658`.

## Catalogue identity

- **Record:** catalogue id 76, Lab "Robotera", Robot "Star 1".
- The image on page 1 of ROBOTERA's STAR1 brochure (native 2380 × 3368): the whole robot in three-quarter view, with helmet, folded hands and both feet. The title, the contact block and the textured background are excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 13, PR not yet merged)

- **PNG:** `assets/robots/robotera-star1/robotera-star1-full-body.png`, 1014 × 3210 px, sha256 `eeedc091fba6949ac12f73beb222088e78e5895b1cda8840732a963d4162390b` (= the prepared.png).
- **WebP:** `assets/robots/robotera-star1/robotera-star1-full-body.webp`, sha256 `901e333b2ae8d20013ab3a2b94d9765072e0ba74d1e800b6d843541ed95a4917`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
