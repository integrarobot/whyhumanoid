# Tien Kung 3.0 (X-Humanoid): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Beijing Humanoid Robot Innovation Center's. No open licence is presumed. The site credits it as "Image: Beijing Humanoid Robot Innovation Center, Tien Kung 3.0, inverted pose".
- **Page:** https://www.x-humanoid.com/m/news-view-251.html
- **File:** https://www.x-humanoid.com/storage/website/2026/10-14/6acf3d66d7f11-1-55178.jpg
- **Context (Codex):** Exact maker launch article on TienKung 3.0, image7 native1920x1280, full robot in inverted handstand pose, head/hands/feet all visible with margin. Preserve original inverted pose, DO NOT rotate to simulate standing or invent parts. Caption TienKung 3.0 manufacturer demonstration image, inverted pose; no claim autonomy from image. White-on-white segmentation needs careful mask of head near arms. Root inspected native, all actual robot complete. Other candidates rejected: cropped hero jstg.png footcut, kneeling image6 basket occludes foot, jumping image4 step occludes foot. Common footer MP4 predates launch, not version evidence; do not use it.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/tienkung-3-inverted/`.
- **Original:** `original.jpg`, 1920 × 1280 px, RGB, 112,809 bytes, sha256 `f9bd647a1260404724814fd5aab7871be290ad2630f5080e544327e7bcd4620a` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [200, 300, 880, 1100], alpha bounding box [42, 50, 592, 755], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `47af60887c9c1e9a19b9d1044cb26f661086a144753bf92bf8c1be9f720db49a`, mask sha256 `8ccd62d78ccbc56babbe6dcad72244c1115307a7a8ca030051d4ce5f03239e47`.

## Catalogue identity

- **Record:** catalogue id 204, Lab "X-Humanoid", Robot "Tien Kung 3.0".
- Image 7 of the maker's Tien Kung 3.0 launch article (native 1920 × 1280): the whole robot in an inverted pose, with head, hands and feet. The original orientation is kept; nothing is rotated or added. The white studio is excluded by the alpha mask. It is a demonstration image and says nothing about autonomy.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 14, PR not yet merged)

- **PNG:** `assets/robots/x-humanoid-tienkung-3/x-humanoid-tienkung-3-full-body.png`, 590 × 745 px, sha256 `47af60887c9c1e9a19b9d1044cb26f661086a144753bf92bf8c1be9f720db49a` (= the prepared.png).
- **WebP:** `assets/robots/x-humanoid-tienkung-3/x-humanoid-tienkung-3-full-body.webp`, sha256 `3f96ca0a34a6fc00ad8939ea96436c9451af22010911454ca656174402a6f88b`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
