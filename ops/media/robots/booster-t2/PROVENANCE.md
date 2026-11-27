# T2 (Booster Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** Booster Robotics's. No open licence is presumed. The site credits it as "Image: Booster Robotics".
- **Page:** https://www.booster.tech/booster-t2
- **File:** https://fe-cdn.booster.tech/booster-official-website/release-0.1.22/_astro/robot-t2.DZUi1Dbz.webp
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/booster-t2/`.
- **Original:** `original.webp`, 1200 × 1448 px, RGB, 41,170 bytes, sha256 `58db7797638ac1ff2d79512675188aa917794bdcaa930ab4898c159009e7e604` (equal to Codex's manifest).
- **Codex's preparation:** opaque or uneven original; Codex computed a non-generative mask (isnet-general-use via rembg), kept the original's RGB exactly and changed only alpha, crop and padding. Files `mask.png` and `prepared.png` (sha256 `f531b554927c669fb6c12ec09540c703addab70782b618d039fa76bc3d054874`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 148, Lab "Booster", Robot "T2".
- Booster T2, the navigation image of the official T2 page (opaque original, earlier rejected as a source while no mask cutout was allowed). Mask cutout by Codex (isnet-general-use), colour unchanged. The robot is shown whole in a jump; the current requirement is a whole robot with a transparent background, and the pose does not prevent its use (Codex, 27 Nov 2026); the left hand is partly translucent in the cutout, as the mask leaves it. Not T1 (14) nor K1 (149).

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-02/booster-t2/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; native resolution kept (no scaling).

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Files integrated (image batch 2, PR not yet merged)

- **PNG:** `assets/robots/booster-t2/booster-t2-full-body.png`, 874 × 755 px, lossless, sha256 `08b1ed982c72a0a5326e3c268cc7f5597dd83bb4eb57055731853b6fc793bb6a`.
- **WebP:** `assets/robots/booster-t2/booster-t2-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `84e8e7f853595154036a0a7ff73227b75fefb86b66214dd03c9ff357b81b6dcf`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
