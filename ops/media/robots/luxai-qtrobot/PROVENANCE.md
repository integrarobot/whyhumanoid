# Not disclosed (Lux): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 11, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** LuxAI's. No open licence is presumed. The site credits it as "Image: LuxAI, QTrobot render".
- **Page:** https://luxai.com/humanoid-social-robot-for-research-and-teaching/
- **File:** https://luxai.com/wp-content/uploads/website-refactor/qt-robots/QT_big_hero.png
- **Context (Codex):** Catalogue record53 is Lux / Not disclosed, all technical specs unspecified; manufacturer URL is luxai.com. Exact current product page is QTrobot for research and teaching, with this native QT_big_hero.png759x1601 full manufacturer product render. Actual physical QTrobot photographs on same page confirm geometry. Name the pictured QTrobot in alt/credit; do not change master/model title or infer walking. This is a source-identified product on a previously unspecified manufacturer entry, not a claim all rows/specs refer to it. Independently review mapping and render vs mascot concern.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 7496b6e (candidates-11) and 864fcbc (candidates-12)); kept in `ops/media/intake-remaining-2026-11-27/batch-11/luxai-qtrobot/`.
- **Original:** `original.png`, 759 × 1601 px, P, 210,963 bytes, sha256 `605f621a98522efdc07bd0453cf108bb0c9395962260d7b44d448f599c7c687a` (equal to Codex's manifest).
- **Preparation:** original with its own transparency; non-generative alpha mask (Claude: original alpha); crop ROI [0, 0, 759, 1601], alpha bounding box [38, 21, 720, 1567], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `5d6687e2d0ee470a08e4f22ee3b163982e866d92d1d2ae8cc107df8c0f050d8c`, mask sha256 `d82446f95a9bf4ca5711d2fe327533412b08d713630b18e5ecd15d2220f1eb6f`.

## Catalogue identity

- **Record:** catalogue id 53, Lab "Lux", Robot "Not disclosed".
- The catalogue record is Lux with the model not disclosed; LuxAI's current product page for research and teaching presents QTrobot with this native render (QT_big_hero.png), and photographs on the same page match its geometry. The picture is named QTrobot in the caption and alt text; the record's name and specifications are not changed.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 11, PR not yet merged)

- **PNG:** `assets/robots/luxai-qtrobot/luxai-qtrobot-full-body.png`, 722 × 1586 px, sha256 `5d6687e2d0ee470a08e4f22ee3b163982e866d92d1d2ae8cc107df8c0f050d8c` (= the prepared.png).
- **WebP:** `assets/robots/luxai-qtrobot/luxai-qtrobot-full-body.webp`, sha256 `1db2cabdd0f309d51c18da0404d82d54b9a98abecfd6f6fd99e535456be0370f`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
