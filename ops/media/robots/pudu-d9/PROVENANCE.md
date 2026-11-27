# D9 (Pudu): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Pudu Robotics's. No open licence is presumed. The site credits it as "Image: Pudu Robotics, D9 manufacturer brochure render (2025)".
- **Page:** https://www.pudurobotics.com/en/products/d9
- **File:** https://cdn.pudutech.com/PUDU_D9_20250103_CN_577d07e2ad.pdf
- **Context (Codex):** Official maker PDF D9singlepage Chinese bilingual brochure2025-01-03. PDFlogicalpage2 embeddedfront productimage548x1572 object28 + original softmask548x1572, extracted nativeRGBimage004 andsoftmask005 viaPDFimages, combinedownalphaONLY. Notpagerendered orupscaled. Cleancompletehead,bothactualhands,bothfeet. Brochurevectorcalloutsare outsideembeddedimage, NONEonbody, so this source solves old400x480 resolutionissue and darkvideoambiguousbackground. Alphabbox20,28,531,1542; noopaqueedges. Root nativeRGBAcompositeinspected. Existing manufacturer product render, caption PuduRobotics, D9 manufacturer brochure render(2025). D9NOTD7. Preserveownalpha/nativeRGB, crop/padonly. No specschanged,noclaimnavigationorautonomyfromphoto. Brochurenotesfeaturelimitations not taskscope; do notcopycapabilityclaims.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41) and 1c2c9a0 (candidates-42)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/pudu-d9-brochure-original/`.
- **Original:** `original.png`, 548 × 1572 px, RGBA, 568,554 bytes, sha256 `d80c6f6f6e822a10c71f1501450d929a8d8aabda6d6e76e2549efac1821c399c` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; the original is the PDF image object with its own soft mask (pdf-native-rgb.png and pdf-native-softmask.png, combined without rendering the page); cropped and padded only. The soft mask leaves the diagonal slots of the hip vent grille transparent, as the maker drew them; they are not filled); crop ROI [0, 0, 548, 1572], alpha bounding box [20, 28, 531, 1542], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `5bb26a2aac4ed70eccb6c076ab721e55ec72ca556ebcb488354493826c6b83b1`, mask sha256 `f0dc18a3408fa25eef438b5391dcf1817c16e3139b4a1e688af622b5d43284d2`.

## Catalogue identity

- **Record:** catalogue id 155, Lab "Pudu", Robot "D9".
- The front product image in Pudu Robotics' D9 brochure of 3 January 2025 (page 2, the embedded image with its own soft mask, native 548 × 1572): the whole robot with head, both hands and both feet. The brochure's callout lines are outside the image. The soft mask leaves the slots of the hip vent grille open, as drawn. It is D9, not D7, and nothing about navigation or autonomy is implied.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 16, PR not yet merged)

- **PNG:** `assets/robots/pudu-d9/pudu-d9-full-body.png`, 551 × 1554 px, sha256 `5bb26a2aac4ed70eccb6c076ab721e55ec72ca556ebcb488354493826c6b83b1` (= the prepared.png).
- **WebP:** `assets/robots/pudu-d9/pudu-d9-full-body.webp`, sha256 `436f52dad5b3facda014bb82fad94b3360bf541311376793005a3543084b529f`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
