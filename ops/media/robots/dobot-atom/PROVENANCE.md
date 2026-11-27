# Atom (Dobot): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 5, scope "C/D makers" (Javier, 27 Nov 2026; non-generative mask cutouts, faithful RGB).

## Source

- **Image:** DOBOT's. No open licence is presumed. The site credits it as "Image: DOBOT".
- **Page:** https://www.dobot-robots.com/products/humanoid-robots/atom.html
- **File:** https://a.storyblok.com/f/298593/x/9971361e2e/atom-brochure.pdf
- **Extraction:** Official DOBOT ATOM brochure page3 xref63 native3376x2110, biped ATOM Max; not wheeled ATOM-W xref64.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-cd` (commit cc1923c) and kept in `ops/media/intake-cd-2026-11-27/batch-05/atom/`.
- **Original:** `original.jpeg`, 3376 × 2110 px, RGB, 199,199 bytes, sha256 `6bc6effb469790b75384c2b41c530d18332f8030e2c71e9d5e73e89024bdbc68` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (non-generative alpha mask); crop ROI [0, 0, 3376, 2110], alpha bounding box [1262, 156, 1949, 2013], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `c79952583ba1290728e932f9ec613b8a2f0f9ecbf9c17dbe9283ac7052572afb`) and the mask, reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 24, Lab "Dobot", Robot "Atom".
- Image extracted unmodified from the official DOBOT ATOM brochure (page 3, image xref 63, 3376 × 2110; PDF sha256 f344875042c2b2cc30d8b816b5f557e33099a749780d32b45f3e161b8b225f2f, kept outside Git), linked from the official ATOM page: the bipedal ATOM Max, not the wheeled ATOM-W (xref 64) nor ATOM D. DOBOT's JP Max.png was rejected (circles and text over the robot).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 5, PR not yet merged)

- **PNG:** `assets/robots/dobot-atom/dobot-atom-full-body.png`, 727 × 1897 px, sha256 `c79952583ba1290728e932f9ec613b8a2f0f9ecbf9c17dbe9283ac7052572afb` (= Codex's prepared.png).
- **WebP:** `assets/robots/dobot-atom/dobot-atom-full-body.webp`, sha256 `139d9a9d203721e2ddf00b1df0f670eb03e2503f72350291c050c6bb9ea1efa7`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
