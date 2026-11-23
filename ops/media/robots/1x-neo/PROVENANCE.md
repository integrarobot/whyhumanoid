# NEO (1X): full-body image, provenance and cutout

Not published: `ops/` is excluded from the site (`_config.yml`). The published files are in `assets/robots/1x-neo/`.

## Source

- **What:** a studio photo of NEO by 1X: full body, head to feet, light grey background.
- **Chosen by:** Javier on 23 Nov 2026. He picked a high-resolution WebP from 1X and converted it to PNG without visual changes (`neo-1x-original.png`).
- **Supplied:** through Codex, as a chat attachment.
- **Source URL:** not recorded. It was not supplied with the image, and none is invented here.
- **Rights:** the image is 1X's. The site credits it as "Image: 1X".

### What Claude received

`neo-1x-original-as-received.webp`, kept here unmodified:
- 2000 × 1125 px, RGB, 39,592 bytes;
- sha256 `5349d68cf38daa53ba413b33f117553b738f11bc1993d07b72a5a1152f77c135`.

This is the chat attachment as it reached the session. The chat re-encoded it to WebP, so it is not byte-identical to `neo-1x-original.png`. The robot spans about 266 × 950 px of it, and that is the ceiling of the published resolution.

**Pending:** if Javier's PNG has more detail, replace this file with it and re-run the recipe below.

## Cutout (23 Nov 2026)

**Principle:** only an alpha channel is computed. The robot is not regenerated, repainted or reinterpreted.

1. **Mask.** BiRefNet (`birefnet-general`, via `rembg` 2.x) produced `neo-mask-birefnet-general.png`. It is kept, so the cutout reproduces without the 1 GB model.
2. **Recipe.** `cutout.py` reproduces `assets/robots/1x-neo/neo-full-body.png` byte for byte from the two files above:
   - `python3 cutout.py neo-1x-original-as-received.webp neo-mask-birefnet-general.png out.png`
   - It needs pillow, numpy, scipy and pymatting.

   It fixes three defects of the raw mask with rules limited to where they occur:
   - **Hand gap.** Background showed through between NEO's left hand and thigh. It is closed off by the thumb, so a flood fill from outside could not reach it. It is cleared in that narrow column only, because a global colour rule would also eat the light back of the head (about 225–240 against a 241 background).
   - **Contact shadow.** The shadow under the soles is grey like the soles. The sole's bottom edge is found per column from the shadow core and median-smoothed, and the floor below it becomes transparent. Heels and toes are intact.
   - **Edges.** The colours of semi-transparent edge pixels are un-mixed from the known studio background (pymatting `estimate_foreground_ml`), so there is no white halo on the dark site.
3. **Checks:**
   - The opaque pixels are exactly the original's (`opaque_unchanged: true`).
   - Alpha is 0 at every corner.
   - The result was inspected on the site's dark surfaces (#0B0C0E, #111316), on a checkerboard and on white, at full size and zoomed into the head, hands and feet.

## Published files

| File | Size | Notes |
|---|---|---|
| `assets/robots/1x-neo/neo-full-body.webp` | 291 × 971, 56 KB | WebP with alpha, quality 92, alpha lossless; served first |
| `assets/robots/1x-neo/neo-full-body.png` | 291 × 971, 275 KB | lossless PNG with alpha; fallback |

## Where the site uses them

- `tools/robot-presentation.json` holds the image, its alt text and credit.
- The robot page and the homepage dossier display it with `object-fit: contain`, at its own aspect ratio, never cropped.

## Comparison with Codex's batch cutout (23 Nov 2026)

`neo-codex-cutout-as-received.png` is kept here for comparison, unmodified:
- 421 × 1240 px, RGBA;
- sha256 `c8cc94228dbdb271dcc59b3d171a0a6cb5dd57bf7f977958efb63436b051472b`;
- made with rembg u2net.

On the site's dark surface and on white it shows a wide soft grey halo around the whole body: 248k semi-transparent pixels against 11.5k in the published cutout. The published cutout (BiRefNet mask, hand gap and contact shadow cleared, edges un-mixed) is cleaner, so it stays. As Javier asked, NEO is not changed or duplicated.
