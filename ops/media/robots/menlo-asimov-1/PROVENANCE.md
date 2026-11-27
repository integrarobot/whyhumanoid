# Asimov 1 (Menlo): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 9, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Menlo's. No open licence is presumed. The site credits it as "Image: Menlo".
- **Page:** https://menlo.ai/asimov-1
- **File:** https://menlo.ai/images/asimov/asimov-orange-full-front-cutout.webp
- **Context (Codex):** Official Menlo Asimov1 page exact image asimov-orange-full-front-cutout.webp, alt Asimov1 humanoid robot, front view. Whole orange finished model with both feet, not exploded kit/build stages or chair accessory.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 330772e); kept in `ops/media/intake-remaining-2026-11-27/batch-09/menlo-asimov-1/`.
- **Original:** `original.webp`, 727 × 2045 px, RGBA, 148,668 bytes, sha256 `fb8176a434409abe6844c893cac2c4bada428cfc8765086eb40ac67546cbbc64` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Alpha85..230, components<30px excluded; source visible RGB unchanged;20px transparent pad); crop ROI [0, 0, 727, 2045], alpha bounding box [44, 44, 684, 1970], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `eb816d411053edeb69dc5295b1243c318cdeb64a935f04e4c0cd6d924b23ca92`, mask sha256 `bba2f5270eb73504db08f38a9fa3f36e32794030a8dfc88128633240bbb07c72`.

## Catalogue identity

- **Record:** catalogue id 192, Lab "Menlo", Robot "Asimov 1".
- Menlo's Asimov 1 page, image asimov-orange-full-front-cutout.webp, alt "Asimov 1 humanoid robot, front view": the finished orange model with both feet, not the kit or build stages. The record is Asimov 1.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 9, PR not yet merged)

- **PNG:** `assets/robots/menlo-asimov-1/menlo-asimov-1-full-body.png`, 680 × 1966 px, sha256 `eb816d411053edeb69dc5295b1243c318cdeb64a935f04e4c0cd6d924b23ca92` (= the prepared.png).
- **WebP:** `assets/robots/menlo-asimov-1/menlo-asimov-1-full-body.webp`, sha256 `fde632b90e814107f249a871309b91ba8993cd4543384d9a6376bdb0dc232279`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
