# Generation 1 (Vanar): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 16, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Vanar Robots's. No open licence is presumed. The site credits it as "Image: Vanar Robots, Generation 1 manufacturer product render".
- **Page:** https://www.vanarrobots.com/Gen1
- **File:** https://www.vanarrobots.com/images/Renders/WebP/File100Full.webp
- **Context (Codex):** Exact maker Generation1 page and alt VanarGeneration1; native6675x4702 existing technical/product render, whole single biped in center spotlight. Head, actual black hands, both feet whole, ample margins. Native RGB image path explicitly Renders; mandatory caption VanarRobots, Generation1 manufacturer product render. Darkbody on darkgrey studio background, careful alpha mask required; isolate robot only, no floor/shadow/glow orRGBbrightening. ApproxROI2600,700..4100,4200 root examined atnative, independentadjustwholefigure. Exposed mechanical body and simple openheadneck configuration are original, do not add shells orfingers. CurrentofficialGen1 details andphoto corroborate same design, notanotherfuturegeneration. No capability/spec changes or copyof aspirationalmarketing.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 8ba9356 (candidates-35), 91a9ac1 (candidates-36 and 37), feb3c3e (candidates-38), e0d60a7 (candidates-39), 5168cc8 (candidates-40), 7a9d62e (candidates-41) and 1c2c9a0 (candidates-42)); kept in `ops/media/intake-remaining-2026-11-27/batch-16/vanar-generation1-product-render/`.
- **Original:** `original.webp`, 6675 × 4702 px, RGB, 926,132 bytes, sha256 `fed5ca2bfacffb433ea165da090f148281caccf5708f187bfb98ab838c8c708a` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-keyed-mask.png; levels 85..230; the studio background is a flat grey of exactly 52; inside six rectangles of the original (the interiors of the four hip and knee U brackets, x 3045..3218 and 3436..3647 at y 2398..2466, x 3039..3240 and 3430..3647 at y 3113..3203, and the two forearm gaps at the elbows, x 2815..2934 at y 1973..2020 and x 3766..3860 at y 1973..2011) the alpha is lowered by the distance to grey 52 (transparent at 6 or less, kept at 16 or more), so the background seen through those openings is out; segmentation-birefnet-keyed-mask.png is the mask used. Four small flat-grey zones stay opaque because it is not shown that they are background: two hip slots (x 3412..3433 and 3237..3257, y 2229..2260), x 2922..2936 at y 2113..2200, and x 3414..3458 at y 2532..2563 (Codex, 27 Nov 2026: the six corrections accepted, not widened; the four zones kept opaque)); crop ROI [2550, 800, 4100, 3960], alpha bounding box [216, 141, 1358, 3070], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `bde30d397f33aa719559c6cc10daf559d177a6809793157c57083419aab7b059`, mask sha256 `ab47e1930a3756699895128d78e64fa0be8130c321a7cc77fcdc24dc6e24981a`.

## Catalogue identity

- **Record:** catalogue id 95, Lab "Vanar", Robot "Generation 1".
- The render on Vanar Robots' Generation 1 page (native 6675 × 4702): the whole robot with head, both hands and both feet, with its exposed mechanical body and open neck as designed. The studio, the floor and the spotlight are excluded by the alpha mask; the background seen through six openings of the hip, knee and elbow brackets is removed too (reviewed by Codex), and four small flat-grey zones whose nature cannot be shown are kept.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 16, PR 251, merge 43d8984, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/vanar-generation-1/vanar-generation-1-full-body.png`, 1182 × 2969 px, sha256 `bde30d397f33aa719559c6cc10daf559d177a6809793157c57083419aab7b059` (= the prepared.png).
- **WebP:** `assets/robots/vanar-generation-1/vanar-generation-1-full-body.webp`, sha256 `06b55f630d1fb3e06da7a5bc360bf67e9d9731a022f6d5f7d70a43f15f0f301c`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
