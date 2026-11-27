# REX G1 (RoboScience): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** RoboScience's. No open licence is presumed. The site credits it as "Image: RoboScience, REX G1 video still".
- **Page:** https://www.robosci.com/rex-g1/
- **File:** https://www.robosci.com/wp-content/uploads/2026/10/REX-G1%E4%BA%A7%E5%93%81%E8%A7%86%E9%A2%91.mp4 (frame 0 at 25 fps, extracted by Codex as original-frame-0.png)
- **Context (Codex):** Exact manufacturer REX-G1 product video, first title frame explicitly names REX G1 beside the whole wheeled humanoid, both hands and entire chassis/wheels visible. Source is an existing product illustration/video still, label manufacturer video still; not new rendering or hardware demonstration claim. Native decoded frame preserved,1920x1080 or actual manifest dimensions. Isolate only whole right-hand robot, excluding title/logo/backdrop/ground shadow. Independent visual/native mask review needed.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e; Calvin-40 and Zerith H1: 7496b6e; REX G1: d1e4d2f)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/roboscience-rex-g1/`.
- **Original:** `original.png`, 3840 × 2160 px, RGB, 712,231 bytes, sha256 `489d86af7c1f53ac5f4fd495ad0b8ccba7acbe275fc2fd2a11e14d6cebc95526` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230; title, logo, backdrop and ground shadow excluded); crop ROI [1950, 150, 3050, 2080], alpha bounding box [120, 148, 984, 1839], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `7972793f9637ad1fd2b3e87dc98ce946e67ddc4ce01ea768df8203c86d5e90fa`, mask sha256 `c15cab5198c21aa18adb1879d252cec433912f46029b5214de076aba006ebb9f`.

## Catalogue identity

- **Record:** catalogue id 198, Lab "RoboScience", Robot "REX G1".
- Frame 0 of RoboScience's official REX-G1 product video, whose title card names REX G1 beside the robot (an existing manufacturer video still, not a new rendering): the whole wheeled humanoid with both hands and the entire chassis and wheels. The title, logo, backdrop and ground shadow are excluded by the alpha mask. The record is REX-G1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 10, PR 232, merge 4db495d, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/roboscience-rex-g1/roboscience-rex-g1-full-body.png`, 904 × 1731 px, sha256 `7972793f9637ad1fd2b3e87dc98ce946e67ddc4ce01ea768df8203c86d5e90fa` (= the prepared.png).
- **WebP:** `assets/robots/roboscience-rex-g1/roboscience-rex-g1-full-body.webp`, sha256 `f5157d4dd76a429a9e519c0bf0e9a932a2c2ae607e9d40fdf349d3adb04c3802`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
