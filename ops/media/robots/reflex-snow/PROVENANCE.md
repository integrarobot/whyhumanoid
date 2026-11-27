# Reflex (Reflex): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Reflex Robotics's. No open licence is presumed. The site credits it as "Image: Reflex, video still with snow shovel".
- **Page:** https://www.reflexrobotics.com/
- **File:** https://image.mux.com/aWwI02dxncxiVnlB42nzktdNdVaT8Ie701cZNIuGJSLfo/thumbnail.png?time=12
- **Context (Codex):** Manufacturer homepage embeds this exact Mux playbackID for label Snow (rootreadhydration). Native1080x1920 video still at12s. Whole actual platform including tall rear mast rounded top, lowered humanoid head, both hands/arms, wheeled base visible with margins. Holding shovel; preserve visible held tool, original snow on tool as required, no invented hidden blade. Exclude distant scene/ground snow; foreground snow not part of robot. Native bodyroughbbox[220,170,760,1300], shovelextends[220,700,820,1560]. Frame0 has elbow cropped atleft and MUST NOT be used. Frame12chosenbecauseboth elbows inbounds and complete mast/base. Caption Reflex with snow shovel, official video still, not evidence of autonomous operation/capability. Prepare alpha non-generatively, no RGB changes.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/reflex-snow-video/`.
- **Original:** `original.png`, 1080 × 1920 px, RGB, 3,268,747 bytes, sha256 `5528989a03b1d57edb0f66c5d3ab2b08bbe57393c922654581a318375aa0712a` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [180, 140, 860, 1620], alpha bounding box [44, 31, 570, 1395], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `00485ff4127529bdf487a445ee3cbbf2103239b60ba112a665a08ba14e0a0578`, mask sha256 `065edbe33e010c1ecc87cd9e5739c1e41a03821762086e4cb7456164e0f8958a`.

## Catalogue identity

- **Record:** catalogue id 73, Lab "Reflex", Robot "Reflex".
- A still at 12 s of the video embedded on the maker's homepage under the label Snow (native 1080 × 1920): the whole platform with its tall rear mast, the lowered head, both arms and hands and the wheeled base, holding a snow shovel that is kept as its tool. The street, the ground snow and the building are excluded by the alpha mask; the hidden part of the blade is not invented. Frame 0 was not used because the left elbow is cut there. It is not evidence of autonomous operation.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 13, PR not yet merged)

- **PNG:** `assets/robots/reflex-snow/reflex-snow-full-body.png`, 566 × 1404 px, sha256 `00485ff4127529bdf487a445ee3cbbf2103239b60ba112a665a08ba14e0a0578` (= the prepared.png).
- **WebP:** `assets/robots/reflex-snow/reflex-snow-full-body.webp`, sha256 `900713a89bf0062057ac559ad15607295fca7695960a315d1fa07263dc678d51`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
