# Beomni (Beyond Imagination): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 17, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Beyond Imagination via Newswire's. No open licence is presumed. The site credits it as "Image: Beyond Imagination, Beomni manufacturer press image (2023), via Newswire".
- **Page:** https://www.beyondimagination.com/news/
- **File:** https://cdn.nwe.io/files/x/df/40/30c398e3ff7354e861425fbbd458.jpg
- **Context (Codex):** Maker News page directly embeds this Newswire CDN image alongside its own manufacturing-partnership release dated2023-08-07. Native1200x628 single complete blue Beomni on white. Whole actual head incl two thin blue antennae, both real white hands, full original black wheeled chassis including side wheels and two small supportcasters. Body spans approximatelyy50..578 (~528px), so native crop plus20px margin meets500 minimum without enlargement. Root visually examined original full resolution. No person/prop overlaps robot, no table hiding base, no extraneous brand text on background. Alpha only, keep narrow antennae/wheelspokes and native RGB; avoid chopping fingertips and supportcasterarm, remove white background without perforating white hands. Honest caption BeyondImagination, Beomni manufacturer press image (2023), via Newswire. Historicalmakerconfiguration, no claim currenthardwareversion or autonomousdeployment. Different from lowquality homepagecollage/teddyface sources, allparts are visible here.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit c21bf62 (candidates-44), 56c65d0 (candidates-45), 5c11af4 (candidates-46) and acda4f4 (candidates-47)); kept in `ops/media/intake-remaining-2026-11-27/batch-17/beomni-2023-manufacturer-press-image/`.
- **Original:** `original.jpg`, 1200 × 628 px, RGB, 55,226 bytes, sha256 `f63e0b5d741ca2efe7a14408705cdbafe121c251728333bdb0318c27cb51f3bf` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-keyed-mask.png; levels 85..230; the thin blue antennas and head arcs carried a white rim of the press-photo background; inside x 580..680, y 40..92 of the original the alpha is lowered by distance to white (transparent at 8 or less, kept at 26 or more), except over the white LED on top of the head (x 626..648, y 69..87), which is left as masked; segmentation-birefnet-keyed-mask.png is the mask used. The arcs are one or two pixels wide in the JPEG and keep a faint light edge); crop ROI [430, 30, 760, 600], alpha bounding box [33, 20, 299, 547], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `af5f376d79476cbfd251d2ab1c29a36c40bf439258f4904028ce18345c41d2d2`, mask sha256 `ead0465482d71eae18f5d301fb837c47187af7ad3981bde1d73b4aee5be56242`.

## Catalogue identity

- **Record:** catalogue id 12, Lab "Beyond Imagination", Robot "Beomni".
- The press image that Beyond Imagination's News page embeds with its release of 7 August 2023, served by Newswire (native 1200 × 628): the whole Beomni, with head and its two thin antennas, both white hands, the black chassis and its two large and two small wheels. The white background is excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 17, PR not yet merged)

- **PNG:** `assets/robots/beyond-imagination-beomni/beyond-imagination-beomni-full-body.png`, 306 × 567 px, sha256 `af5f376d79476cbfd251d2ab1c29a36c40bf439258f4904028ce18345c41d2d2` (= the prepared.png).
- **WebP:** `assets/robots/beyond-imagination-beomni/beyond-imagination-beomni-full-body.webp`, sha256 `b2131ca1e95c7655fdea8d1f042fb98ab4fddfb84aecef299f3d7bad7c3de215`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
