# VB1 (Lanxin Robotics): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 14, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** Lanxin Robotics's. No open licence is presumed. The site credits it as "Image: Lanxin Robotics, VB-01 VersaBot brochure image (2024)".
- **Page:** https://pub-mediabox-storage.rxweb-prd.com/exhibitor/products/exh-8fa3d198-57b0-4a17-8e9d-ef4a58dc5a12/product-documents/pro-02a38744-4ce5-4f2f-bafb-ca8d9269152e/0060ecac-8e94-4eed-9b50-7d64c604579d.pdf
- **File:** https://pub-mediabox-storage.rxweb-prd.com/exhibitor/products/exh-8fa3d198-57b0-4a17-8e9d-ef4a58dc5a12/product-documents/pro-02a38744-4ce5-4f2f-bafb-ca8d9269152e/0060ecac-8e94-4eed-9b50-7d64c604579d.pdf
- **Context (Codex):** Manufacturer Lanxin brochure, cover explicitly VB-01 Humanoid Robot Versabot, page2 VersaBot VB-1, version V2024.7.18. Hosted on event exhibitor CDN, not maker web host. PDFpage1 embeddedimage002 native2997x1870, two complete product views; choose FRONT left figure, head/sensor, both grippers, full mast/base/allvisiblewheels. ApproxROI[550,250,1450,1870], independently widen enough so LEFT gripper not cut. Other figure and floor shadows excluded. RGB002 has no ownalpha; PDF softmask003 is4500x2807 (differentresolution), so do not directly apply without correct coordinate handling. Alpha-only BiRefNet okay. Caption VersaBot VB-01 (2024 brochure render) on genericVB1record, do not label VB1-I newer configuration. Newsource without redannotationdotsONbody, unlike rejectedcurrentwebgraphic.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 639618b (candidates-19), 33e84f4 (candidates-20), 4d699a5 (candidates-21), 8417c21 (candidates-22), b09a967 (candidates-23) and 421cfc1 (candidates-24)); kept in `ops/media/intake-remaining-2026-11-27/batch-14/lanxin-vb01-brochure/`.
- **Original:** `original.png`, 2997 × 1870 px, RGB, 1,002,274 bytes, sha256 `7dae1f397c1a60718bc5e9acc39f741f468f5b0dd2d9963be6b35dd857bd1210` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 85..230); crop ROI [420, 200, 1520, 1870], alpha bounding box [221, 138, 961, 1592], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `1ba6e0ee1b4bed6c2e984591f20102befceef2b889ccfa7ee5587f672c9090f2`, mask sha256 `5455cf1d97fd07ed835b3cb9786af645d4af7c7cbab2a8696584d1e7b80cac9a`.

## Catalogue identity

- **Record:** catalogue id 188, Lab "Lanxin Robotics", Robot "VB1".
- The front figure on page 1 of Lanxin Robotics' 2024 VB-01 VersaBot brochure (native 2997 × 1870; the copy read is hosted by an event exhibitor platform): the whole robot with head, both grippers, mast and wheeled base. The second view and the floor shadows are excluded by the alpha mask. White arm parts flagged by the flat-background check are the robot's own surfaces.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Files integrated (image batch 14, PR not yet merged)

- **PNG:** `assets/robots/lanxin-vb-01/lanxin-vb-01-full-body.png`, 780 × 1494 px, sha256 `1ba6e0ee1b4bed6c2e984591f20102befceef2b889ccfa7ee5587f672c9090f2` (= the prepared.png).
- **WebP:** `assets/robots/lanxin-vb-01/lanxin-vb-01-full-body.webp`, sha256 `4e85fb8c6b0caf4a36cf4cafb176ee818b7248a4161b8d34aef47b9d220746d5`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
