# Lumi (Lightberry): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Lightberry's. No open licence is presumed. The site credits it as "Image: Lightberry, Lumi manufacturer photograph, rooftop configuration".
- **Page:** https://lightberry.com/press/dow-approval
- **File:** https://cdn.ploy.ai/3245c4e2-1929-4ad1-b0ef-5b8c15535544/user/60fb2a78-w-1410.webp
- **Context (Codex):** Exact maker press page, alt explicitly Lumi rooftopWashingtonDC. Native1842x2138 complete yellow robot head, both actual yellowgrippers, both feet, margins. Whole realphoto, root original inspected. Keepactual black/redneckcables, yellowgripperends (nohumanfingersinvented), remove railing/posts/trees/city/tiles/shadow. Nopeopleorpropsoccludingbody. Caption Lightberry, Lumi manufacturer photograph, rooftop configuration. Do not copy claims of governmentapproval, politicalstatus orpressstory into catalogue; only imagepresentation. Footer/productLumi identityexact, noUnitreeG1 genericreplacement.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41) and 1c2c9a0 (candidates-42)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/lightberry-lumi-rooftop/`.
- **Original:** `original.webp`, 1842 × 2138 px, RGB, 560,490 bytes, sha256 `8f6ccfd701e6b6caf2695a145f11e2a98a858c09f3854081e8610f2498bc46a5` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240); crop ROI [480, 360, 1360, 2110], alpha bounding box [80, 58, 806, 1707], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `acbd3a1a6956fa159a298cf6ec7ad5f5e97e67588e8f302051f3e5f8d9340fd7`, mask sha256 `09f0ea243eee41757bcdb6675af2493cf799c4ce59261ec1e5cb87f3cecfe26a`.

## Catalogue identity

- **Record:** catalogue id 123, Lab "Lightberry", Robot "Lumi".
- A photograph on Lightberry's press page (native 1842 × 2138): the whole Lumi with head, both yellow grippers, the neck cables and both feet. The railing, the gravel, the tiles, the trees and the city behind are excluded by the alpha mask. Nothing from the accompanying announcement is added to the record.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 16, PR 251, merge 43d8984, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/lightberry-lumi/lightberry-lumi-full-body.png`, 766 × 1689 px, sha256 `acbd3a1a6956fa159a298cf6ec7ad5f5e97e67588e8f302051f3e5f8d9340fd7` (= the prepared.png).
- **WebP:** `assets/robots/lightberry-lumi/lightberry-lumi-full-body.webp`, sha256 `fe4b234a9f45bb43ecbaeea1ac218f1937aa2adf490e2867a786bc1fb2607cd0`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
