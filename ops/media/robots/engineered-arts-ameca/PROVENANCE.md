# Ameca (Engineered Arts): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Engineered Arts's. No open licence is presumed. The site credits it as "Image: Engineered Arts".
- **Page:** https://engineeredarts.com/tritium/robots/ameca
- **File:** https://media.engineeredarts.com/wp-content/uploads/2025/09/Ameca-Full-Size-Social-Humanoid-Robot-interview-at-Techsauce-Global-Summit-2024-Engineered-Arts.jpg
- **Context (Codex):** Ameca full-size at Techsauce Global Summit2024, both hands/feet and complete circular mounting base. Not Desktop. Native source666x999; robot crop250x769 including20px padding; modest resolution, no upscale.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 2daba0a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/ameca/`.
- **Original:** `original.jpg`, 666 × 999 px, RGB, 223,813 bytes, sha256 `534fe09aebfa9f24e1a25e6fa807151dcfd47b73efdef93d49212ae7a1e1b394` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (ISNET alpha mask levels85..230.); crop ROI [140, 200, 365, 945], alpha bounding box [11, 8, 221, 737], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `32d7870117e6e266bd7c6d1372703a73fecfd0f0fe9b2356726bc34a5c3ce098`) and the mask (sha256 `648077ee8e6ae62327bb76f67f71b7b9279fa54fa6539f3431f8f817627ef0bf`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 28, Lab "Engineered Arts", Robot "Ameca".
- Full-size Ameca photographed by Engineered Arts at Techsauce Global Summit 2024 (image on the official Engineered Arts media server), with head, both hands, both feet and the complete circular base. Not Ameca Desktop.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

- **Quality:** Modest resolution: 250 × 769 from a 666 × 999 official photograph; no upscaling. Replace when a larger faithful full-body Ameca image is found.

## Files integrated (image batch 6, PR not yet merged)

- **PNG:** `assets/robots/engineered-arts-ameca/engineered-arts-ameca-full-body.png`, 250 × 769 px, sha256 `32d7870117e6e266bd7c6d1372703a73fecfd0f0fe9b2356726bc34a5c3ce098` (= Codex's prepared.png).
- **WebP:** `assets/robots/engineered-arts-ameca/engineered-arts-ameca-full-body.webp`, sha256 `3dbb114d4f23a1b7239b46f003f3be6be2206ef184ba3fb735b77c7672cfb8b2`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
