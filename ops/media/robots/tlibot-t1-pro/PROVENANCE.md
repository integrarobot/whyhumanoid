# TLIBOT T1 (Tlibot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** TLIBOT's. No open licence is presumed. The site credits it as "Image: TLIBOT, T1 Pro manufacturer brochure image (2025), via World Robot Conference".
- **Page:** https://www.worldrobotconference.com/profile/robot/download/2025/06/30/%E5%A4%A9%E9%93%BE%E6%9C%BA%E5%99%A8%E4%BA%BA-%E4%BA%A7%E5%93%81%E6%A0%B7%E5%86%8C-%E4%B8%AD%E8%8B%B1%E6%96%87%E7%89%8820250519_20250630141622A201.pdf
- **File:** https://www.worldrobotconference.com/profile/robot/download/2025/06/30/%E5%A4%A9%E9%93%BE%E6%9C%BA%E5%99%A8%E4%BA%BA-%E4%BA%A7%E5%93%81%E6%A0%B7%E5%86%8C-%E4%B8%AD%E8%8B%B1%E6%96%87%E7%89%8820250519_20250630141622A201.pdf
- **Context (Codex):** Manufacturer authored bilingual product catalogue2025-05-19, hosted WorldRobotConference; logicalPDFpage4 (spread), left page productoverview explicitly T1Pro continued from productintro spreadpage3. Embedded nativeRGB image858x1812 + originalPDF softmask same dimensions object153, extracted with pdfimages, combined ownalpha ONLY, nopage rendering or upscale. Original RGBunderalpha contains repeatedrobotstrobe; originalPDFmask itself selects ONLY single completeforeground walkingfigure. Whole head, actualgripperhands, bothfeet including raisedrearfoot, margins. Alpha bbox137,82,731,1729, noopaqueimageedgepixels. Preserve maker ownalpha/nativeRGB; do not treat repeatedimagesoutsideoriginalmaskaspartofrobot. Caption TLIBOT, T1Pro manufacturer brochure image (2025), via WorldRobotConference. Specific variant T1Pro, notTianzhenZ1 orY1; catalogue202genericT1 name unchanged, no specificationchanges. Root originalRGB/softmask/compositechecked atnative. Existing technical product render, do notclaim hardwarephoto. Needs independentreview then crop/pad only.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41) and 1c2c9a0 (candidates-42)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/tlibot-t1pro-brochure/`.
- **Original:** `original.png`, 858 × 1812 px, RGBA, 1,351,894 bytes, sha256 `403139cdc5180c5227793a7deebd7bb05ed51772cfc15ae0fdc2e59da1bbe7c6` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; the original is the PDF image object with its own soft mask (pdf-native-rgb.png and pdf-native-softmask.png, combined without rendering the page); the soft mask selects the single foreground figure, so the repeated strobe figures in the RGB stay out; cropped and padded only. A 339 px slit between the rod and the shin of the standing leg is semi-transparent in that soft mask and is left as the maker drew it); crop ROI [0, 0, 858, 1812], alpha bounding box [137, 82, 731, 1729], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `0e3042fe7cb4a70aa37186bc097dcf761fa1bd4d67b683a5f77104023d894e16`, mask sha256 `551da592e92f861144370d449cebddd93c935ebb2a9b168d670245f08a6831e2`.

## Catalogue identity

- **Record:** catalogue id 202, Lab "Tlibot", Robot "TLIBOT T1".
- The T1 Pro product image in TLIBOT's bilingual product catalogue of 19 May 2025, hosted by the World Robot Conference (page 4, the embedded image with its own soft mask, native 858 × 1812): the whole robot with head, both grippers and both feet, the rear one raised. The repeated strobe figures in the image stay outside the maker's mask. It is a technical product render, not a photograph; the record keeps its generic T1 name.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 16, PR not yet merged)

- **PNG:** `assets/robots/tlibot-t1-pro/tlibot-t1-pro-full-body.png`, 634 × 1687 px, sha256 `0e3042fe7cb4a70aa37186bc097dcf761fa1bd4d67b683a5f77104023d894e16` (= the prepared.png).
- **WebP:** `assets/robots/tlibot-t1-pro/tlibot-t1-pro-full-body.webp`, sha256 `da81aa949950e2e7265bbb0b4f503a6dd5da4888097a3333d96472b9e2fdf226`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
