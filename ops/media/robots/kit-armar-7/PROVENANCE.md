# ARMAR-7 (KIT H²T): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 13, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** KIT H2T's. No open licence is presumed. The site credits it as "Image: KIT H²T, ARMAR-7, Robotics I lecture photograph".
- **Page:** https://pasta.place/Informatik/Robotik_1_%5BHIS%5D/Folien/WS_24-25/Robotics-I-Chapter-00-Introduction.pdf
- **File:** https://pasta.place/Informatik/Robotik_1_%5BHIS%5D/Folien/WS_24-25/Robotics-I-Chapter-00-Introduction.pdf
- **Context (Codex):** KIT/H2T authored Robotics I lecture PDF, hosted on third-party student archive pasta.place, not maker-hosted. Page 32 The Active ARMARs explicitly labels white complete robot at right ARMAR-7 (root viewed full rendered slide). Extracted embedded RGB image003 native300x640 plus original grayscale soft mask004 same dimensions. Whole head, both hands and circular wheeled base; original resolution max640 qualifies. Other green robots are ARMAR-6/ARMAR-DE, do not substitute. Preserve source RGB and original soft mask; trim/pad only after alpha review. Credit KIT/H2T ARMAR-7 lecture photograph, honest hosted-copy provenance; no open licence asserted.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 6d1eb96 (candidates-14), 54f4cf5 (candidates-15), 23aba3a (candidates-16), 164cfaf (candidates-17), 617be62 (candidates-18) and 639618b (candidates-19)); kept in `ops/media/intake-remaining-2026-11-27/batch-13/kit-armar-7/`.
- **Original:** `original.png`, 300 × 640 px, RGB, 136,015 bytes, sha256 `1400e7f6c3f279e98841441cf08fbc89a7c232c4844638c659352526d989e1c4` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: the source's own soft mask, source-mask.png; levels 0..255; largest region kept); crop ROI [0, 0, 300, 640], alpha bounding box [12, 7, 285, 631], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `ef9001127bb4831c499a52edc60a644dfa1594b5ea546593fb51fc71561c5f78`, mask sha256 `c690d9a33625a3b3c7e0af4f2594a28c45c4dca1d2e2ee5e2a7230b4fd90aafc`.

## Catalogue identity

- **Record:** catalogue id 186, Lab "KIT H²T", Robot "ARMAR-7".
- The photograph of ARMAR-7 on page 32 of KIT H²T's Robotics I lecture slides ("The Active ARMARs"), which label the white robot on the right as ARMAR-7; extracted at its native 300 × 640 with the slide's own soft mask. The copy read is hosted by a third-party student archive, not by KIT. The whole robot with head, both hands and the round wheeled base. Not ARMAR-6 or ARMAR-DE.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

- **Quality:** Small native source: 313 × 664 px as prepared, not enlarged.

## Published files (image batch 13, PR 242, merge c314f66, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/kit-armar-7/kit-armar-7-full-body.png`, 313 × 664 px, sha256 `ef9001127bb4831c499a52edc60a644dfa1594b5ea546593fb51fc71561c5f78` (= the prepared.png).
- **WebP:** `assets/robots/kit-armar-7/kit-armar-7-full-body.webp`, sha256 `510e2a655788764c71cba42c0023b3011ccca4ac8eb80d8980db75605681ff5e`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
