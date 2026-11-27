# Eden (Eden): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 18, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Eden Robotics's. No open licence is presumed. The site credits it as "Image: Eden Robotics, complete prototype platform on caster base, official demo still (2026)".
- **Page:** https://edenrobotics.ai/
- **File:** https://edenrobotics.ai/assets/videos/plug-and-play.mp4
- **Context (Codex):** Official Eden product homepage video shows a physical complete dual-arm prototype on its small rectangular caster base in a plug-and-play demonstration. Frame184 at184/(24000/1001)=7.6743s,1920x1080, approximateROI x780..1080 y365..980. Actual tilted screen/sensor head, both arms and real black pinch hands, central column and whole rectangular white base with visible small casters. No head/legs invented and base is actual supporting platform shown, not studio floor. Person to right and case to left are separated from robot, exclude. Preserve real black cables looping between arms/waist and tiny casters, remove floor shadow only via alpha. Native body about580px high plus padding meets minimum. Caption Eden Robotics, complete prototype platform on caster base, official demo still (2026). Exact model name/OEM remains unconfirmed in master; no specifications/identity reclassification. This completes a source previously assumed only unknown model; no copying website design or text involved.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 5083e8a (candidates-48), 2021f8c (candidates-49) and 6f9b29e (candidates-51)); kept in `ops/media/intake-remaining-2026-11-27/batch-18/eden-complete-native-demo-platform/`.
- **Original:** `original.png`, 1920 × 1080 px, RGB, 425,852 bytes, sha256 `eeaeee27d480a9899abc53bd1de04d802b9b7721ea010a729fa2d39224d9a0c6` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240; largest region kept); crop ROI [760, 345, 1100, 1000], alpha bounding box [36, 35, 302, 623], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `7246585eb3387c49e63aab870c7b35756543517975218363425908a6f2d61cf0`, mask sha256 `6e0710948617275fd7c01bcb84e94ae998ab37ef2dcfc8f069cb1e06413481e1`.

## Catalogue identity

- **Record:** catalogue id 114, Lab "Eden", Robot "None".
- Frame 184 (7.67 s) of Eden Robotics' plug-and-play demo video, at its native 1920 × 1080: the whole prototype platform with its tilted head, both grippers, the column and the rectangular base on small casters. The studio, the person and the black box beside it are excluded by the alpha mask. The maker does not disclose a model name, and none is given here.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 18, PR 255, merge 6df3a84, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/eden-prototype-platform/eden-prototype-platform-full-body.png`, 306 × 628 px, sha256 `7246585eb3387c49e63aab870c7b35756543517975218363425908a6f2d61cf0` (= the prepared.png).
- **WebP:** `assets/robots/eden-prototype-platform/eden-prototype-platform-full-body.webp`, sha256 `4ccfe4153b392d6e6d31190b70b53bf79bb4bc3aff47cbbbdc4be4264084f5e7`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
