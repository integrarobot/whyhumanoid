# Calvin-40 (Wandercraft): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 10, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Wandercraft's. No open licence is presumed. The site credits it as "Image: Wandercraft, Calvin-40 without end effectors".
- **Page:** https://www.wandercraft.eu/de/calvin
- **File:** https://cdn.prod.website-files.com/6a5e1730e4dc3d8a81f2d73d/6a5e1a62e73bc247efda6671_calvin-05-front-no-end-effector-3434-ligthroom-1.png
- **Context (Codex):** Official exact Calvin product page front view, filename explicitly calvin-05-front-no-end-effector. Whole actual headless robot without end effectors. No invented head/hands. Caption configuration without end effectors; catalogue Calvin40. NativeRGBA625x1131, inspect its alpha rather than assuming transparent interior.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit f7d1436 (Luna: c3ca72e; Calvin-40 and Zerith H1: 7496b6e)); kept in `ops/media/intake-remaining-2026-11-27/batch-10/wandercraft-calvin-40/`.
- **Original:** `original.png`, 625 × 1131 px, RGBA, 606,594 bytes, sha256 `2c71dda2f80291c9908b0b8bd24239424cebce6c5184717bb4c8a907219ac817` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha; original alpha levels 120..250 (drops a faint alpha haze, the soft floor shadow and a light matte fringe)); crop ROI [0, 0, 625, 1131], alpha bounding box [54, 1, 570, 1079], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `e9fc07d2e5b286ed5cca6000d49cbf73f47cc2b18fdff2dfc0c8e299db5ed8b1`, mask sha256 `52af5416a34db6efa877abf6c35cc90f6a74785f703205dc5f65e18934727864`.

## Catalogue identity

- **Record:** catalogue id 97, Lab "Wandercraft", Robot "Calvin-40".
- Wandercraft's official Calvin page, front view whose file name reads calvin-05-front-no-end-effector: the whole robot, which has no head by design, shown without end effectors. The record is Calvin-40; nothing is added (no head, no hands).

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 10, PR not yet merged)

- **PNG:** `assets/robots/wandercraft-calvin-40/wandercraft-calvin-40-full-body.png`, 556 × 1118 px, sha256 `e9fc07d2e5b286ed5cca6000d49cbf73f47cc2b18fdff2dfc0c8e299db5ed8b1` (= the prepared.png).
- **WebP:** `assets/robots/wandercraft-calvin-40/wandercraft-calvin-40-full-body.webp`, sha256 `bdc23736e7d75e15cea4f69b4b85d9b610b2cc7eaffad5e3af8ef08283cbe64d`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
