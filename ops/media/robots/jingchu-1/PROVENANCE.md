# JingChu 1 (Jingchu Humanoid): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Jingchu Humanoid's. No open licence is presumed. The site credits it as "Image: Jingchu Humanoid, JingChu 1 manufacturer render".
- **Page:** https://www.jingchurobot.cn/product_detail/1.html
- **File:** https://omo-oss-image1.thefastimg.com/portal-saas/pg2025073116424452690/cms/image/fdf4c32f-c70f-4f70-94ae-ad603983827a.png?vf=B7gH3s
- **Context (Codex):** JingChu 1 manufacturer render, bipedal configuration. Exact product_detail/1.html identifies 荆楚1号, own native RGBA800x1205 with whole head, both articulated hands and feet. Preserve own alpha, crop20padding only. Not Elf wheeled model.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/jingchu-1/`.
- **Original:** `original.png`, 800 × 1205 px, RGBA, 573,421 bytes, sha256 `562c4735c992bbe7e9c7b5e8e81006036f94eb693b84a3a8ee1f63c2a3dcd9e5` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; original alpha levels 120..205; specks removed); crop ROI [0, 0, 800, 1205], alpha bounding box [145, 3, 656, 1205], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `3855deb68f0cc8de8c71f74554dbcc7a1328e5d156bff323503bd584485a37ab`, mask sha256 `fa496a57ed631bb257cc09acc333068fd343146d00b8172d19b67e32aaad7377`.

## Catalogue identity

- **Record:** catalogue id 182, Lab "Jingchu Humanoid", Robot "JingChu 1".
- The render on the maker's JingChu 1 product page (native 800 × 1205, with its own transparency): the whole biped with head, both articulated hands and both feet. The original alpha fades the front foot (from 242 down to about 207); it is levelled 120..205 so the foot is opaque, RGB unchanged. The sole reaches the bottom of the publisher's file only with its faint antialiased edge (alpha at most 131 in the last row). Not the wheeled Jingchu Elf.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 14, PR not yet merged)

- **PNG:** `assets/robots/jingchu-1/jingchu-1-full-body.png`, 551 × 1242 px, sha256 `3855deb68f0cc8de8c71f74554dbcc7a1328e5d156bff323503bd584485a37ab` (= the prepared.png).
- **WebP:** `assets/robots/jingchu-1/jingchu-1-full-body.webp`, sha256 `28957c8dc3b296879172706dec9652d4a4d39bcfe85bd90a2dc793f334885f65`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
