# KAIST Humanoid (KAIST DRCD Lab): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** KAIST DRCD Lab's. No open licence is presumed. The site credits it as "Image: KAIST DRCD Lab, KAIST Humanoid v0.9 official video still (October 2026)".
- **Page:** https://www.youtube.com/watch?v=HBFZ2a0Dj9s
- **File:** https://www.youtube.com/watch?v=HBFZ2a0Dj9s
- **Context (Codex):** Whole robot in walking three-quarter pose, approximate original ROI x920..1310 y100..1000. Native head, both actual grippers and both feet are complete. No blue KAIST letter overlaps body in this selected frame; letters are separate left. Preserve real exposed metal members, neck cables/white ties and dark gripper geometry, including transparent gaps proven by background; no extra human fingers or shells. Remove track, white lane lines, trees/buildings, letters and shadow via alpha only. Mandatory caption KAIST Humanoid v0.9 official video still, October 2026. This is exact current v0.9 configuration, not an older lower-body prototype. Footage does not by itself establish autonomy.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41) and 1c2c9a0 (candidates-42)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/kaist-humanoid-v09-native-video/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 2,793,310 bytes, sha256 `61bbcca821d5a9543f4a193a420188d022887127e75dcc9e5e2cc9a675c86b09` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-handle-mask.png; levels 150..240; largest region kept; alpha-only exclusion [112, 148, 134, 182]; two thin vertical background rods to the left of the neck are excluded (original x 1012..1034, y 228..262). The rectangular handle on top of the head shell belongs to the robot (Codex compared frames 4650 to 4850: it moves with the head); its dark left bar (original x 1030..1062, y 142..150) is weak in the model mask, so inside that rectangle only the alpha is raised from the model mask re-levelled 20..120 and from the luminance of the bar itself (opaque at 30 or darker, none at 60, where the foliage behind is 60 to 110); segmentation-birefnet-handle-mask.png is the mask used. Nothing is drawn: every visible pixel is the original's); crop ROI [900, 80, 1340, 1010], alpha bounding box [44, 51, 395, 900], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `dc5ef11efa8162a39422b83e36b919d0fb51c56e596835801954ce64e239c8e5`, mask sha256 `700c3b9fd1fd0c65a63bc19153fc6cee3a38ce2ae86a66dbcc550fd7cf680474`.

## Catalogue identity

- **Record:** catalogue id 185, Lab "KAIST DRCD Lab", Robot "KAIST Humanoid".
- Frame 4750 (79.17 s) of the KAIST DRCD Lab video at its native 1920 × 1080: the whole v0.9 robot walking, with head and its top handle, the neck cables and white ties, both grippers and both feet. The track, the lane lines, the letters, the trees and the shadow are excluded by the alpha mask. The footage does not by itself show autonomy.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 16, PR not yet merged)

- **PNG:** `assets/robots/kaist-humanoid-v09/kaist-humanoid-v09-full-body.png`, 391 × 889 px, sha256 `dc5ef11efa8162a39422b83e36b919d0fb51c56e596835801954ce64e239c8e5` (= the prepared.png).
- **WebP:** `assets/robots/kaist-humanoid-v09/kaist-humanoid-v09-full-body.webp`, sha256 `eb319a19891fdd6c5a6e04c963f8eb7e447d2a0fc18915badc96ac1e97212c31`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
