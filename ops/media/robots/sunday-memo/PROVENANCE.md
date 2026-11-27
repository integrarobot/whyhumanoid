# Memo (Sunday): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Sunday's. No open licence is presumed. The site credits it as "Image: Sunday, Memo official video still with plate".
- **Page:** https://www.sunday.ai/
- **File:** https://stream.mux.com/xLLkokRSG7wrmPVmYfSE3Hz2TwlKI83Ohf8vHejgI4o.m3u8
- **Context (Codex):** Exact Sunday homepage Next payload references mux playbackId xLLkokRSG7wrmPVmYfSE3Hz2TwlKI83Ohf8vHejgI4o. Manufacturer native1920x1080 HLS rendition, concatenated original TS segments without reencoding; frame1035 decoded SEQUENTIALLY (OpenCV seeking HLS TS gives decode errors, avoid seeking). FPS30000/1001=29.97002997, time34.5345s,1046frames. Whole Memo head with cap, both arms and both grippers, full mast and whole mobilebase with margin. Robot holds a plate, ENTIRE PLATE visible above dishwasher door (unlike earlier880/940/980). Preserve plate with hand, caption official video still with plate. Remove cabinetdoor, rack, floor/nearbyfurniture by alpha only; no robot occlusion. Nativebody~850px. Root inspected1035atnative, exactsource frame included. No autonomy/availability claim; no specification change. Mask only, preserve RGB/native and20px padding.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/sunday-memo-native-video/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 1,151,945 bytes, sha256 `1f859e257f6e57eb52a0c893aa6f7f434aaf9f94b5b53d8b36a20fbf9c7c5b9b` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [760, 150, 1300, 1070], alpha bounding box [36, 35, 489, 888], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `db09e1b7a64a91146ccf2a6e7cde2d2437ce4359ba042acedcad7a29cb75d612`, mask sha256 `443285b34dbb97a46f5f3aac92aa3b60a83999e21103998cd7703e5ca5e79110`.

## Catalogue identity

- **Record:** catalogue id 120, Lab "Sunday", Robot "Memo".
- Frame 1035 (34.53 s) of the video on Sunday's homepage, decoded at its native 1920 × 1080: the whole Memo with its cap, both arms and grippers, the mast and the wheeled base, holding a whole plate above a dishwasher door. The kitchen, the dishwasher door and rack and the floor are excluded by the alpha mask; the plate is kept. No availability or autonomy is implied.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 14, PR not yet merged)

- **PNG:** `assets/robots/sunday-memo/sunday-memo-full-body.png`, 493 × 893 px, sha256 `db09e1b7a64a91146ccf2a6e7cde2d2437ce4359ba042acedcad7a29cb75d612` (= the prepared.png).
- **WebP:** `assets/robots/sunday-memo/sunday-memo-full-body.webp`, sha256 `18c391f550fe4cd9ce7feb86a7898dad5445a353dd93242be255f58391bdd832`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
