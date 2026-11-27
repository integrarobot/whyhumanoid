# Walker S1 (Ubtech): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 12, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** UBTECH's. No open licence is presumed. The site credits it as "Image: UBTECH, Walker S1 with tote, manufacturer product image".
- **Page:** https://www.ubtrobot.com/en/humanoid/products/walker-s1
- **File:** https://owebsite-cdn.ubtrobot.com/resources/image/2024/10/13/600678134571077.jpg
- **Context (Codex):** Exact WalkerS1productpage native1080x1920 tallmanufacturerproductimage, robotcarryingblacktote. Wholeheadhandsasvisiblebehindheldbin, bothfeetandfloormargin. Preserveentiretoteasheldpayload, noinventedoccludedfingers. Isolatefromfactoryandfloorreflection; noRGBbrightness/coloradjustment. CaptionWalkerS1withtote, manufacturerproductimage/render. Never useWalkerS2navigationimageforthisrecord.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 864fcbc (candidates-12), c4c8edb (candidates-13), 6d1eb96 (candidates-14) and 54f4cf5 (candidates-15)); kept in `ops/media/intake-remaining-2026-11-27/batch-12/ubtech-walker-s1/`.
- **Original:** `original.jpg`, 1080 × 1920 px, RGB, 880,737 bytes, sha256 `bc70bd554c8960a14f4437fc152798f25828977e87e499b1310525ab54fea62a` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [200, 80, 900, 1500], alpha bounding box [77, 65, 622, 1335], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `b76b4060576ac7c553497991dfc3fbb3ae1d2d3cf9971ea8859b535e3f82fb21`, mask sha256 `6d482c96f3bddb6e0f72f51380e01e83ecf90413b844d1534f43ba2101316e04`.

## Catalogue identity

- **Record:** catalogue id 91, Lab "Ubtech", Robot "Walker S1".
- The tall product image on UBTECH's Walker S1 page (native 1080 × 1920): the whole robot with head and both feet, carrying a black tote that is kept as its payload; the fingers hidden behind the tote are not invented. The factory background and the floor reflection are excluded by the alpha mask; colours and brightness are unchanged. Not the Walker S2 image (record 142).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 12, PR 240, merge fa0b12c, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/ubtech-walker-s1/ubtech-walker-s1-full-body.png`, 585 × 1310 px, sha256 `b76b4060576ac7c553497991dfc3fbb3ae1d2d3cf9971ea8859b535e3f82fb21` (= the prepared.png).
- **WebP:** `assets/robots/ubtech-walker-s1/ubtech-walker-s1-full-body.webp`, sha256 `c4ce553cc25c5c23617ef6ba4a60311a6ac3d1f56ae10ec003e8b7dbb5a7cd4f`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
