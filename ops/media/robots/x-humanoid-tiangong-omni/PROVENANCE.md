# TianGong Omni (X-Humanoid): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** X-Humanoid's. No open licence is presumed. The site credits it as "Image: X-Humanoid, TianGong Omni front-view technical render".
- **Page:** https://www.x-humanoid.com/detail/omni.html
- **File:** https://www.x-humanoid.com/oss/static/img/omni-three-view.png
- **Context (Codex):** Exact TianGong Omni maker product page provides three-view PNG native2157x1212 with ownalpha. Select ONLY central FRONT figure, wholehead both actual openhands and both feet. ApproxROI[780,0,1450,1212], independently check handmargins; do not crop atx850 as thumbmaytouch. Exclude leftside/backview figures; no paintedcallouts. Existingmakertechnicalrender, captionTianGongOmnifront-viewmanufacturertechnicalrender. Ownalpha must be inspected; preserve sourceRGB/native. NotTienKung3.0orTianYi2.0. Hero/widegroup images either smalloroverlap, this frontfigureiscomplete ~1000px native.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/xhumanoid-omni-front/`.
- **Original:** `original.png`, 2157 × 1212 px, RGBA, 616,407 bytes, sha256 `7b2770506fb83f27c8be16802b96d648668392c546e6e2464b90b09b71faf8f3` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha); crop ROI [780, 0, 1450, 1212], alpha bounding box [70, 110, 482, 1120], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `07cc05fdb9c66cb11ef1d4fa815ee7027598d112efc6c9cd9407e1188ad6a977`, mask sha256 `a2db1e408ce6f7640e1c8034acbd3f5e733c3c809b3bb43ef8ce8d539153d00d`.

## Catalogue identity

- **Record:** catalogue id 206, Lab "X-Humanoid", Robot "TianGong Omni".
- The front figure of the three-view render on X-Humanoid's TianGong Omni product page (native 2157 × 1212, with its own transparency): the whole robot with head, both open hands and both feet; the side and back views are left out. Not Tien Kung 3.0 or Tian Yi 2.0.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 14, PR 246, merge 6fecfb5, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/x-humanoid-tiangong-omni/x-humanoid-tiangong-omni-full-body.png`, 452 × 1050 px, sha256 `07cc05fdb9c66cb11ef1d4fa815ee7027598d112efc6c9cd9407e1188ad6a977` (= the prepared.png).
- **WebP:** `assets/robots/x-humanoid-tiangong-omni/x-humanoid-tiangong-omni-full-body.webp`, sha256 `7e1e6b6b333b25fddc59b1678f546d59bb2d828079a5ef2b97c8bae7a1a73613`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
