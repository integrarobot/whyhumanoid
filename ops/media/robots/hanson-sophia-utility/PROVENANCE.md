# Sophia (Hanson): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Hanson Robotics's. No open licence is presumed. The site credits it as "Image: Hanson Robotics, Sophia Utility platform, skirted configuration".
- **Page:** https://www.european-lotteries.org/system/files/inline-files/Hanson_2023-06-14.pdf
- **File:** https://www.european-lotteries.org/system/files/inline-files/Hanson_2023-06-14.pdf
- **Context (Codex):** Hanson Robotics authored presentation dated 2023-06-14 hosted on European Lotteries, not maker-hosted. Page22 explicitly Sophia Utility Platform. Embedded RGB004 native516x1003 plus original softmask005: complete head, articulated arms/hands, full long skirt covering original wheeled platform. Product image/configuration is skirted Utility, NOT biped and no invented feet or assertion hidden chassis is visible. Mask source has broad fading around skirt and white fringe in RGB; carefully refine alpha only if possible keeping whole garment, source RGB/native size unchanged. Caption Sophia Utility platform, skirted configuration, Hanson Robotics presentation. Top of head and skirt faint antialias touch boundaries; independently inspect whole opaque geometry before acceptance. This supplements next batch to10 after THEMIS99 used in batch12. No new specs/master changes, no licence inferred and no outreach.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/hanson-sophia-utility/`.
- **Original:** `original.png`, 516 × 1003 px, RGB, 260,254 bytes, sha256 `1f9d48f5e406589f66e3aad04d27141fc7f379f3deeb44ab0590d39365815fbb` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: the source's own soft mask, source-mask.png; levels 215..240); crop ROI [0, 0, 516, 1003], alpha bounding box [25, 1, 495, 978], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `b2338245489770b0a2022b5e8684c31116bf32a8563fdee061fdebb72c65b4d5`, mask sha256 `6f8277e078a13be54e558146b77fc0b61e3828735de220bfa814a98e7e449db7`.

## Catalogue identity

- **Record:** catalogue id 38, Lab "Hanson", Robot "Sophia".
- The image of the Sophia Utility Platform on page 22 of a Hanson Robotics presentation dated 14 June 2023 (native 516 × 1003, extracted with its own soft mask; the copy read is hosted by the European Lotteries association). The whole robot with head, both articulated arms and hands and the long skirt that covers its wheeled platform; no feet are added and no chassis is shown. The soft mask's broad feathered edge, which carried a white fringe, is levelled to 215..240; RGB unchanged.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 13, PR 242, merge c314f66, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/hanson-sophia-utility/hanson-sophia-utility-full-body.png`, 510 × 1017 px, sha256 `b2338245489770b0a2022b5e8684c31116bf32a8563fdee061fdebb72c65b4d5` (= the prepared.png).
- **WebP:** `assets/robots/hanson-sophia-utility/hanson-sophia-utility-full-body.webp`, sha256 `e6c74193944c95fe012192788724360f4eac19bcb50e8027e6b48765bc097a6c`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
