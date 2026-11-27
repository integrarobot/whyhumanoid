# ProWhite (PL-Universe): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** PL-Universe's. No open licence is presumed. The site credits it as "Image: PL-Universe, ProWhite Robot 2.0 brochure image".
- **Page:** https://www.hannovermesse.de/apollo/hannover_messe_2026/obs/Binary/A1506799/PL-UNIVERSE%20FILE.pdf
- **File:** https://www.hannovermesse.de/apollo/hannover_messe_2026/obs/Binary/A1506799/PL-UNIVERSE%20FILE.pdf
- **Context (Codex):** ManufacturerProWhiteRobot2.0brochurehostedbyHannoverMesse2026,PDFpage1embeddedimage0,native1242x1684. Completeplatformcameraheadtwoactualmulti-gripperhands,wheeledchassisandlevelingpads; allvisiblewithspacearound. IsolateONLYrobotfrombluebackground/floorshadow/reflection. CaptionexplicitProWhiteRobot2.0manufacturerbrochureimage/renderonrecordProWhitefamily, no assertionearliermetricsapplyto2.0,no master/name/specchanges. Currentwebsite1000x1400raisedarmPNGwasREJECTEDbecauseelbow/rightarm/basecropanddamagedalpha; donotreuse. Thisbrochurefulldifferentrectangularchassisconfigurationisidentified2.0byitsowntitle.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/pl-universe-prowhite-2/`.
- **Original:** `original.png`, 1242 × 1684 px, RGB, 396,810 bytes, sha256 `b00fcbd20cd20d0461b326f64880e54e70b59d79823ca80c0f7bcc643df87590` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [0, 0, 1242, 1684], alpha bounding box [291, 511, 933, 1546], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `f8f339401f9f33c23d1f243dca2bb08004778e573a36825a4d1799dcb1c655cd`, mask sha256 `c8f2891ad40b0b14f5532166b41ae0b0f3d70e37e45b08cb2634f9bb6c68dac0`.

## Catalogue identity

- **Record:** catalogue id 195, Lab "PL-Universe", Robot "ProWhite".
- The image on page 1 of PL-Universe's ProWhite Robot 2.0 brochure, hosted by Hannover Messe 2026 (native 1242 × 1684): the whole platform with its camera head, two multi-gripper arms, the wheeled chassis and its levelling pads. The blue background and floor shadow are excluded by the alpha mask. The record is the ProWhite family; no earlier figure is applied to version 2.0.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 13, PR not yet merged)

- **PNG:** `assets/robots/pl-universe-prowhite-2/pl-universe-prowhite-2-full-body.png`, 682 × 1075 px, sha256 `f8f339401f9f33c23d1f243dca2bb08004778e573a36825a4d1799dcb1c655cd` (= the prepared.png).
- **WebP:** `assets/robots/pl-universe-prowhite-2/pl-universe-prowhite-2-full-body.webp`, sha256 `9073e4654aa3de808d62e7673fbcea27bf96a466a7a188fb61226368e528a2d8`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
