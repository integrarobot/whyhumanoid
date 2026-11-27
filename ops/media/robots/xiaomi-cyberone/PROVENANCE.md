# Cyber One (Xiaomi): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Beijing Yizhuang via NCSTI's. No open licence is presumed. The site credits it as "Image: Xiaomi CyberOne, 2024 display photograph via Beijing Yizhuang / NCSTI".
- **Page:** https://www.ncsti.gov.cn/kjdt/scyq/bjjjjskfq/jkdt/202406/t20240605_159440.html
- **File:** https://www.ncsti.gov.cn/kjdt/scyq/bjjjjskfq/jkdt/202406/W020240605332139251140.jpg
- **Context (Codex):** Official government press photograph in report of Xiaomi Robotics move to Yizhuang factory, published2024-06-05, source explicitly Beijing Yizhuang official WeChat. NOT a Xiaomi-hosted image or open licence. Caption under this exact photo explicitly full-size humanoid bionic robot CyberOne, white chest CyberOne visible, matches original2022 design. Whole head, both genuine gripper hands, both feet visible, standing on round CyberDog-branded showroom display plinth. Native1080x1620, body >1100px; leave complete robot, optionally full circular display stand only if caption explicitly says on display stand, but stand NOT robot morphology. Preferred mask robot alone at sole contact, no leg creation. Remove orange wall, floor, external black tripod left, stand if can cleanly separate. No occlusion of robot geometry. Root native source inspected. Caption Xiaomi CyberOne, 2024 display photograph via Beijing Yizhuang / NCSTI. Do not imply current2026generation orassign later specs.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27), 62f03ab (candidates-28), 26e018a (candidates-30), a7c0ffb (candidates-31) and 31e0eb7 (candidates-32)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/xiaomi-cyberone-government-photo/`.
- **Original:** `original.jpg`, 1080 × 1620 px, RGB, 101,685 bytes, sha256 `bcf7d9b8185de88c6f7edfbb29323707fc6bd8313d5b199a65587968281f6184` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-two-pass-mask.png; levels 85..230; the whole-figure pass took in the round display plinth under the feet; a second pass on the feet alone (x 400..740, y 1180..1470 of the original) separates the shoes from the plinth, and the combined mask uses the first pass above y = 1250 and the second from y = 1250 down (the two agree within 0.3 on average in the ten rows above the join), so the plinth, the wall, the floor and the tripod are out); crop ROI [330, 180, 810, 1480], alpha bounding box [44, 33, 431, 1272], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `85f1a1ec3c809ec83471b2f4a22e63d3be8240e1b1fbb33c7c21714de6df2211`, mask sha256 `7dc085337fe164f1502dae6814a0863e9a1b7334244e8dd295b8d9f92c5601ea`.

## Catalogue identity

- **Record:** catalogue id 102, Lab "Xiaomi", Robot "Cyber One".
- The photograph in the official Beijing Yizhuang report of 5 June 2024 republished by NCSTI (native 1080 × 1620), captioned as the full-size humanoid bionic robot CyberOne: the original white 2022 design, whole with head, both grippers and both feet. It stood on a round display plinth, which is not part of the robot; the plinth, the wall, the floor and the tripod are excluded by the alpha mask, cut at the soles. It is not a Xiaomi-hosted image and says nothing about later versions.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 15, PR 249, merge 672539d, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/xiaomi-cyberone/xiaomi-cyberone-full-body.png`, 427 × 1279 px, sha256 `85f1a1ec3c809ec83471b2f4a22e63d3be8240e1b1fbb33c7c21714de6df2211` (= the prepared.png).
- **WebP:** `assets/robots/xiaomi-cyberone/xiaomi-cyberone-full-body.webp`, sha256 `a879f13853b87656990e75dc2f08b802bf1ee419f089a8267d0663675cb70d41`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
