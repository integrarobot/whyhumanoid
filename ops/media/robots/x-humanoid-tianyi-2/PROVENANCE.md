# Tian Yi 2.0 (X-Humanoid): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** X-Humanoid's. No open licence is presumed. The site credits it as "Image: X-Humanoid, TianYi 2.0 manufacturer brochure render (2025), via World Robot Conference".
- **Page:** https://www.worldrobotconference.com/profile/robot/download/2025/07/11/18%E5%85%AC%E5%8F%B8%E4%BB%8B%E7%BB%8D%E6%89%8B%E5%86%8C%E5%8D%B0%E5%88%B7%E7%89%88_20250711192526A076.pdf
- **File:** https://www.worldrobotconference.com/profile/robot/download/2025/07/11/18%E5%85%AC%E5%8F%B8%E4%BB%8B%E7%BB%8D%E6%89%8B%E5%86%8C%E5%8D%B0%E5%88%B7%E7%89%88_20250711192526A076.pdf
- **Context (Codex):** Manufacturer corporate brochure18 onWorldRobotConference2025-07-11. PDFlogicalpage4 rightpage text explicit TianYi2.0, existing maker technical/product render embeddednative7933x2949, object682, image004. Fullrobot withhead,bothactualgrippers,liftcolumnandwholewheeledbase in center, noannotateddots/lines ON body. This solves priorannotatedspecdiagram. Nativecrop approximate[3300,700,4600,2600] independentlyadjust, bodyroughly1300px, allgeometrycomplete. Backgroundpavilion/glassfloor/shadow excluded viaalpha, nofloorreflectionretained. SourcePDFsmaskimage005 onlypageopacity, NOT bodysegmentation; needsmodelmask. Caption X-Humanoid, TianYi2.0 manufacturer brochure render(2025), viaWorldRobotConference. Do not ascribe2026version orchangeanyspecs. Root fullselectednativefigurechecked includinggrippersandwheels. ExtractedPDFimage, notpageupscale.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41) and 1c2c9a0 (candidates-42)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/tianyi-2-brochure-scene/`.
- **Original:** `original.png`, 7933 × 2949 px, RGB, 4,294,351 bytes, sha256 `c7e29593a99eb521fd57de43920bd40d108377f235e037339122ef239a3ab199` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240); crop ROI [3400, 900, 4450, 2450], alpha bounding box [202, 149, 793, 1442], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `e116f32f60c5ec7f213d1d9dab1b696eca0fd9b6bc4943e17f458ee136266473`, mask sha256 `8fed84db218dc5bc7adb24c8fb825a403daa04af44e3f59387679015375ce052`.

## Catalogue identity

- **Record:** catalogue id 205, Lab "X-Humanoid", Robot "Tian Yi 2.0".
- The TianYi 2.0 render in X-Humanoid's corporate brochure hosted by the World Robot Conference (page 4, embedded image, native 7933 × 2949): the whole robot with head, both grippers, the lifting leg and the complete wheeled base, with no annotation on the body. The pavilion, the glass floor and its reflection are excluded by the alpha mask. Not Tien Kung 3.0 or TianGong Omni.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 16, PR 251, merge 43d8984, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/x-humanoid-tianyi-2/x-humanoid-tianyi-2-full-body.png`, 631 × 1333 px, sha256 `e116f32f60c5ec7f213d1d9dab1b696eca0fd9b6bc4943e17f458ee136266473` (= the prepared.png).
- **WebP:** `assets/robots/x-humanoid-tianyi-2/x-humanoid-tianyi-2-full-body.webp`, sha256 `8aa8508d8c1bc5626579bd343fa87895a6ce4dd4bc65a3b809cd931f307f4d1f`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
