# Themis (Westwood): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** WestwoodRobotics's. No open licence is presumed. The site credits it as "Image: Westwood Robotics".
- **Page:** https://www.westwoodrobotics.io/themis/
- **File:** https://www.westwoodrobotics.io/wp-content/uploads/2025/04/2-scaled.png
- **Context (Codex):** ExactTHEMISproductpage, native1920x2560PNG frontstandingwholebiped withheadbothgripper-likehandsandbothfeetcomplete, ownalpha. The source webpage associatesitwithTHEMIS,notBRUCE; catalogueTHEMISfamily. Nativealpha/interiorgapsmustbereviewed; do notautomaticallytrustnativealpha. Preserveactualgrippers,noreconstructedhumanfingers. No model3Drendercreated. Alternativeviews99-35side/99-41threequarteralsocompletebutonlyoneimageperrecord.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/westwood-themis/`.
- **Original:** `original.png`, 1920 × 2560 px, RGBA, 1,761,789 bytes, sha256 `df922a8fc9c248c0b080c166bd767a10ccd979abc9132f0fa54d75ebf3611070` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha); crop ROI [0, 0, 1920, 2560], alpha bounding box [491, 191, 1379, 2369], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `38070e65620308332bb59c5a0dc0e3a55c4bc070141a5779e7db3feb8e52c69e`, mask sha256 `f7e97880f33aabf407c77ef0d3d8db3dcfd91352ee6a2c5894addaa9081c5363`.

## Catalogue identity

- **Record:** catalogue id 99, Lab "Westwood", Robot "Themis".
- The image on Westwood Robotics' THEMIS product page, with its own transparency (native 1920 × 2560): the whole biped with head, both gripper-like hands and both feet. The page associates it with THEMIS, not BRUCE. Nothing is reconstructed.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 12, PR not yet merged)

- **PNG:** `assets/robots/westwood-themis/westwood-themis-full-body.png`, 928 × 2218 px, sha256 `38070e65620308332bb59c5a0dc0e3a55c4bc070141a5779e7db3feb8e52c69e` (= the prepared.png).
- **WebP:** `assets/robots/westwood-themis/westwood-themis-full-body.webp`, sha256 `cc5e7f5be8b7f0e19249d3c849f86502930343a6cf3db316de23ea581a5bb42d`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
