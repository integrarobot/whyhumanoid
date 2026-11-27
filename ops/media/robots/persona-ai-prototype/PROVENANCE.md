# Not disclosed (Persona Inc): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 18, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Persona AI's. No open licence is presumed. The site credits it as "Image: Persona AI, full humanoid prototype, official video still (2026)".
- **Page:** https://persona.ai/
- **File:** https://persona.ai/wp-content/uploads/Q3-Jul-22-2026-Web-Hero-Video-v1_12.mp4
- **Context (Codex):** Official manufacturer homepage embedded video. Select native frame 586 at 24.4167 seconds/24fps, complete actual humanoid prototype head, two real hands, both feet. Approximate ROI x740..1220 y155..1025. Whole hardware seen against grey lab, no suspension cable attached to body. Pipe above/behind head and orange hoist at upper right are BACKGROUND, exclude. Keep actual finger geometry, knee linkages, ankle cables and dark open regions as present in native source; do not convert actual black plates into transparency. Caption Persona AI, full humanoid prototype, official video still (2026). Do not assign an invented model name or generation from filename; catalogue record remains model undisclosed. No master/spec changes.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 5083e8a (candidates-48), 2021f8c (candidates-49) and 6f9b29e (candidates-51)); kept in `ops/media/intake-remaining-2026-11-27/batch-18/persona-ai-whole-prototype-native/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 1,526,083 bytes, sha256 `fad19a64fa6b7a38f7d914ed435a7afc7f0361f4c8f3e02b65d88a1efd9ef308` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-no-duct-mask.png; levels 150..240; the model mask took in the ceiling duct that runs into the top of the head from behind; it is not part of the robot, so every pixel above y = 180 within x 900..1019 of the original is set to alpha 0, where the grey top of the head begins; segmentation-birefnet-no-duct-mask.png is the mask used); crop ROI [720, 140, 1240, 1045], alpha bounding box [45, 40, 480, 870], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `fdf18ff989f9b03bccf83c392bd457c437b34ea0c8bde3d976c66febbe2b0da4`, mask sha256 `8bdf39168f2583872a796dd70bedcaf9aa803e37feaabe5bd7e4f7138788f8b8`.

## Catalogue identity

- **Record:** catalogue id 62, Lab "Persona Inc", Robot "Not disclosed".
- Frame 586 (24.42 s) of the video on Persona AI's homepage, at its native 1920 × 1080: the whole bipedal prototype with head, both hands and both feet, standing unsupported. The ceiling duct that runs into the top of the head from behind, the room and the floor are excluded by the alpha mask. No model name or generation is given, as the maker gives none.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 18, PR not yet merged)

- **PNG:** `assets/robots/persona-ai-prototype/persona-ai-prototype-full-body.png`, 475 × 870 px, sha256 `fdf18ff989f9b03bccf83c392bd457c437b34ea0c8bde3d976c66febbe2b0da4` (= the prepared.png).
- **WebP:** `assets/robots/persona-ai-prototype/persona-ai-prototype-full-body.webp`, sha256 `3c1fd1009844c10e18cd6bdeeca91dfd2fc6b582eb1c60ba1c105f3ef72ee828`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
