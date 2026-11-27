# Motion (VinMotion): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Nguyen Le's. No open licence is presumed. The site credits it as "Image: VinMotion, Motion1 at VEC 2025, event photograph by Nguyen Le".
- **Page:** https://nguyenle.com.vn/event/vinmotion-dau-an-viet-nam-tren-hanh-trinh-chinh-phuc-tuong-lai/
- **File:** https://nguyenle.com.vn/wp-content/uploads/2025/09/image-30.jpg
- **Context (Codex):** Event producer Nguyen Le own portfolio/report dated2025-09-22, explicitly launch Motion1 on2025-08-28 VEC Hanoi. Gallery source9 native854x1280 complete real robot in foreground raising openhand, both feet visible with bottom margin. Source has another ROBOT ILLUSTRATION on billboard BEHIND and ABOVE real one: EXCLUDE entire billboard and illustration, do not segment the drawn robot. Foreground actual robot ROI roughly[330,480,720,1250], complete raised fingertips at~500, head at590, feet1220. Preserve visible exposed cable loops near waist/knees/shoulders. Real hand held atside is curled by originalpose, do not inventfingers. Body~720px qualifies. Exact Motion1 version fixed by historical event page and maker LinkedIn public announcement same2025-08-28, whose threephotos crop legs. Manufacturer currentMotion2/annual2025differentbody not substituted. Caption VinMotion, Motion1 at VEC2025, event photograph by NguyenLe. Credit photographer/event producer, NOT direct maker image or open licence. Whole selected real figure root native inspected; needs alpha-only mask and independent review.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27), 62f03ab (candidates-28), 26e018a (candidates-30), a7c0ffb (candidates-31) and 31e0eb7 (candidates-32)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/vinmotion-motion1-event-2025/`.
- **Original:** `original.jpg`, 854 × 1280 px, RGB, 59,162 bytes, sha256 `31aaba89befac25e876a9058be540a298c2bee93b45bb174fd4b67ea5a6dff6d` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 170..240; largest region kept; levels 170..240 so the thin cable loops at the hips carry as little of the blue billboard behind them as possible; the billboard and its drawn robot, the tents and the asphalt are out); crop ROI [320, 470, 730, 1260], alpha bounding box [31, 34, 374, 759], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `4e8082523dbe4bc56ad49490e54acee0d5ecdd11deefbb3ac44f7759963e1af2`, mask sha256 `031f28ff4be27e6009b448a55b986861cadf155ce4d5b2ba3f11e05009289e85`.

## Catalogue identity

- **Record:** catalogue id 96, Lab "VinMotion", Robot "Motion".
- A photograph from the event producer Nguyen Le's report of 22 September 2025 on the Motion1 launch at VEC, Hanoi, on 28 August 2025 (native 854 × 1280): the real robot in the foreground, whole, with head, the raised open hand, the other hand curled as posed, both feet and the cable loops at the hips. The billboard behind it, with its drawn robot, the tents and the asphalt are excluded by the alpha mask. It is not a maker-hosted image, and it shows Motion1, not the later Motion2.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 15, PR not yet merged)

- **PNG:** `assets/robots/vinmotion-motion1/vinmotion-motion1-full-body.png`, 383 × 765 px, sha256 `4e8082523dbe4bc56ad49490e54acee0d5ecdd11deefbb3ac44f7759963e1af2` (= the prepared.png).
- **WebP:** `assets/robots/vinmotion-motion1/vinmotion-motion1-full-body.webp`, sha256 `1001d7ce4b2b3d546da8039fe433b554a6a0a6fbb97ae8e72a254d4080c25ae4`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
