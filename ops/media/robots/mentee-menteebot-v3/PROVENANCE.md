# MenteeBot (Mentee): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 8, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Mentee Robotics's. No open licence is presumed. The site credits it as "Image: Mentee Robotics, MenteeBot v3".
- **Page:** https://www.menteebot.com/bot/
- **File:** https://www.menteebot.com/demo-videos/MenteeBot_v3.png
- **Context (Codex):** Official MenteeBot /bot/ uses /demo-videos/MenteeBot_v3.png, whole native-alpha1920x3072. Name shown v3 in provenance/alt; do not assert every MenteeBot configuration same.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 299a0d7); kept in `ops/media/intake-remaining-2026-11-27/batch-08/mentee-menteebot-v3/`.
- **Original:** `original.png`, 1920 × 3072 px, RGBA, 2,332,233 bytes, sha256 `c3a8ae2ab69db08476ee7df04656e0806002d8fc85c0b36c8338c30ac369f047` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (original alpha; original alpha levels 175..250); crop ROI [0, 0, 1920, 3072], alpha bounding box [452, 138, 1341, 2867], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `19d3318aaec26039052a3a9d1ee29ea0e5eb1d19ed2707482522fc3d89876211`, mask sha256 `79c7ba2e59fedc5380d7854be196e520889a117ebbc623643e1ba7ca4c51e9f9`.

## Catalogue identity

- **Record:** catalogue id 55, Lab "Mentee", Robot "MenteeBot".
- Official /bot/ page file MenteeBot_v3.png. The catalogue record is MenteeBot, whose public specifications the master says are not automatically gen 3; the image is named v3 and the record's figures are not attributed to it. The original's alpha carries a semi-transparent violet glow behind the robot (alpha up to about 170); it is removed by mapping the original alpha 175..250, without a segmentation model.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 8, PR 228, merge db579f7, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/mentee-menteebot-v3/mentee-menteebot-v3-full-body.png`, 929 × 2769 px, sha256 `19d3318aaec26039052a3a9d1ee29ea0e5eb1d19ed2707482522fc3d89876211` (= the prepared.png).
- **WebP:** `assets/robots/mentee-menteebot-v3/mentee-menteebot-v3-full-body.webp`, sha256 `37a7625e11e4ccc289045dcd6bfc07a48ff1d49686ae5871d0f42cacb3eab73f`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
