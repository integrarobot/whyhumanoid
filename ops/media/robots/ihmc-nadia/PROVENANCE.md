# Nadia (IHMC Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** IHMC's. No open licence is presumed. The site credits it as "Image: IHMC".
- **Page:** https://robots.ihmc.us/humanoid-design
- **File:** https://images.squarespace-cdn.com/content/v1/699a1168fe7b8b3bc64df4db/6e41edc9-513b-45a2-9bbc-5cc728319aa6/20220208_Crouching_TouchingGround_02.jpg
- **Context (Codex):** Official IHMC Humanoid Design page has separate Alex and Nadia (Legacy) sections. These two images are within Nadia section, not Alex. Full white-background crouching photo14 or native-alpha frontal photo15. Review exact full limbs/feet and stray alpha.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 299a0d7); kept in `ops/media/intake-remaining-2026-11-27/batch-08/ihmc-nadia/`.
- **Original:** `original.jpg`, 2170 × 2893 px, RGB, 315,294 bytes, sha256 `1befb37b313bc0d1c0b42a627a25fb50cbd01e68ddcb795641f33e0eedde4ce1` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (birefnet-general mask (rembg, mask only); levels 85..230); crop ROI [0, 0, 2170, 2893], alpha bounding box [51, 253, 2073, 2684], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `1c902c1197f0977cb8e3be757732df9587c5f888a794c1486a23012c9a85b0d4`, mask sha256 `3520e6434649d6fe63c70afab49f00c44aaa3059c421d42ec4226ec89adb46ac`.

## Catalogue identity

- **Record:** catalogue id 43, Lab "IHMC Robotics", Robot "Nadia".
- Photograph in the Nadia (Legacy) section of IHMC's Humanoid Design page, not the Alex section. Its file name begins 20220208, so it is taken to show Nadia's configuration around February 2022 (an inference from the file name, not a stated date). The frontal PNG in the same section was not used because it reaches the bottom and side edges of its file.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 8, PR not yet merged)

- **PNG:** `assets/robots/ihmc-nadia/ihmc-nadia-full-body.png`, 2062 × 2471 px, sha256 `1c902c1197f0977cb8e3be757732df9587c5f888a794c1486a23012c9a85b0d4` (= the prepared.png).
- **WebP:** `assets/robots/ihmc-nadia/ihmc-nadia-full-body.webp`, sha256 `d868814296f048417487fb2ea23e37c2de45d8ac62b04b0f39b390c0374584b3`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
