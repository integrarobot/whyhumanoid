# RoBee (Oversonic): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Oversonic Robotics's. No open licence is presumed. The site credits it as "Image: Oversonic Robotics, RoBee Series R".
- **Page:** https://www.oversonicrobotics.com/media/
- **File:** https://www.oversonicrobotics.com/download/Oversonic_Robee-R-2026-eng.pdf (page 2, image object 242, extracted with pdfimages; PDF sha256 9bf0547bcb0daac94f4462d3d74eb46c023841c51b528cd87606f7abbc61f8b1)
- **Context (Codex):** RoBee Series R, October2026 product sheet, page2 raster image2025x3200 and native PDF soft mask extracted using pdfimages. No re-render/upscale. Original extracted RGB image-000.png and smask image-001.png archived with full official PDF. Whole actual wheeled platform; not RoBee M or F. Catalogue generic RoBee; name SeriesR shown.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 299a0d7); kept in `ops/media/intake-remaining-2026-11-27/batch-08/oversonic-robee-r/`.
- **Original:** `original.png`, 2025 × 3200 px, RGB, 2,104,300 bytes, sha256 `7545ae21a5b13e51e0dc3a9a22b8f3f9c586d31beaa18b49a8505c061dd41405` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (birefnet-general mask (rembg, mask only) on the extracted RGB image; levels 85..230. The PDF soft mask extracted with it (image-001.png) is fully opaque, so it carries no cutout); crop ROI [0, 0, 2025, 3200], alpha bounding box [71, 31, 1981, 3138], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `0ded93b22dcb9d1b92d0ee50962192f754126f6fd17837ec8bd51178d25bca9f`, mask sha256 `3d428bf9e46b4cfba176e69b4716cbdd28a6964f74bf9a6435b8f52af70842e8`.

## Catalogue identity

- **Record:** catalogue id 60, Lab "Oversonic", Robot "RoBee".
- RoBee Series R product sheet (October 2026), page 2: the raster image extracted from the PDF with pdfimages, without re-rendering or scaling. The soft mask extracted with it is fully opaque, so the alpha comes from a segmentation mask only; the RGB is the extracted image's. Not RoBee M or F. The catalogue record is RoBee, in its industrial mobile-base configuration.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 8, PR not yet merged)

- **PNG:** `assets/robots/oversonic-robee-r/oversonic-robee-r-full-body.png`, 1950 × 3147 px, sha256 `0ded93b22dcb9d1b92d0ee50962192f754126f6fd17837ec8bd51178d25bca9f` (= the prepared.png).
- **WebP:** `assets/robots/oversonic-robee-r/oversonic-robee-r-full-body.webp`, sha256 `e47e492acf1afd849bbcd84c7ff3d99a29a97d98f8202a89551d303ebc8fdc12`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
