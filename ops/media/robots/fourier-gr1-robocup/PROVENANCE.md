# GR-1 (Fourier): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** RoboCupGR1hardware-specification's. No open licence is presumed. The site credits it as "Image: RoboCup 2024 team hardware specification, Fourier GR-1 technical render".
- **Page:** https://humanoid.robocup.org/wp-content/uploads/2024-th-mos-adult-specs.pdf
- **File:** https://humanoid.robocup.org/wp-content/uploads/2024-th-mos-adult-specs.pdf
- **Context (Codex):** RoboCup2024 team hardware specification forGR1, PDFpage1embeddedimage0, native210x533 completefronttechnicalrender with marginabovehead/belowfeet, handscomplete. Existingprojecthardware-spectechnicalrender, notnewURDF. Caption specifically RoboCup2024GR1hardware-specification technicalrender; no claimphotoornewFouriergeneration. Nativefigheightabout485+40pad>500; independentlyverifyqualitywithoutupscaling. Otherembedded2160x3840photo hasfootballoccludingfoot, rejected; FourierGitHubrenders havecoordinateaxespaintedoverbody, rejected.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/fourier-gr1-robocup/`.
- **Original:** `original.png`, 210 × 533 px, RGB, 62,251 bytes, sha256 `d79df6353db206860964608c2b363037985b437a0971a52ca9425fca71a2fbb9` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [0, 0, 210, 533], alpha bounding box [25, 13, 178, 491], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `ce6ec5edf0f5dfa7eb2436b9f691725dd239fe5f1ba7061b0df55a36c6723065`, mask sha256 `1770ed6a9ab2455e7bb8dab9c2cad26464320bd21577b298ee4bdc9885c96ae1`.

## Catalogue identity

- **Record:** catalogue id 32, Lab "Fourier", Robot "GR-1".
- The image on page 1 of a RoboCup 2024 team's hardware specification for the Fourier GR-1 (an existing technical render embedded at its native 210 × 533, not a photograph and not a new rendering): the whole robot from head to feet with both hands. No newer Fourier generation is implied.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

- **Quality:** Small native source: 193 × 518 px as prepared, not enlarged.

## Published files (image batch 12, PR 240, merge fa0b12c, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/fourier-gr1-robocup/fourier-gr1-robocup-full-body.png`, 193 × 518 px, sha256 `ce6ec5edf0f5dfa7eb2436b9f691725dd239fe5f1ba7061b0df55a36c6723065` (= the prepared.png).
- **WebP:** `assets/robots/fourier-gr1-robocup/fourier-gr1-robocup-full-body.webp`, sha256 `ec0e06751e00e5061b9e6a44a541f17ef52f48d4f80338ce88c271f693d65e8b`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
