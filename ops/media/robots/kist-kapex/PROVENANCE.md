# KAPEX (co-developed with KIST and LG AI Research) (LG): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 15, All missing images (Javier, 27 Nov 2026) (non-generative mask cutouts, original RGB).

## Source

- **Image:** KIST via Herald Economy's. No open licence is presumed. The site credits it as "Image: KIST, KAPEX concept render (2025), via Herald Economy".
- **Page:** https://biz.heraldcorp.com/article/10586718
- **File:** https://wimg.heraldcorp.com/news/cms/2025/09/30/news-p.v1.20250930.43fac76f89e5451f9477688352a3cc56_P1.png
- **Context (Codex):** KIST-supplied original press concept render, 2025-09-30, hosted by Herald Economy with explicit imagecaption KIST provided and exactKAPEXname. Existing maker/research-institute illustration, NOT actual hardware photograph. Independent contemporaneous ChosunBiz caption explicitly calls same scene artist rendering (https://biz.chosun.com/en/en-science/2025/09/30/KO76AWDKYZGXVCDY55A4UDOU24/?outputType=amp). Native1280x821, complete head/hands/feet, approximately710bodyheight, ample margins. No graphic annotations overbody, KIST/LG logos outside silhouette remove with alpha. Exact originalrecord50KAPEX, do not ascribe depiction as current2026hardwareversion or change anyspecs. Mandatory caption KIST, KAPEX concept render (2025), via Herald Economy. Root native original inspected. Remove floor/reflection/shadows byalpha; visible robot RGB native unchanged. Grey background can require precise mask atfeet but no original clipping.
- **Downloaded:** by Codex, carried without recompression on the transport branch `codex/image-sources-remaining` (commit 66c596a (candidates-25), b07ffac (candidates-26), dc11021 (candidates-27), 62f03ab (candidates-28), 26e018a (candidates-30), a7c0ffb (candidates-31), 31e0eb7 (candidates-32), bbf9ddd (candidates-33) and 17d1e6e (candidates-34)); kept in `ops/media/intake-remaining-2026-11-27/batch-15/kapex-concept-render-2025/`.
- **Original:** `original.png`, 1280 × 821 px, RGBA, 933,443 bytes, sha256 `83b4bb23290c2333c9a5150dfff7625c7b22702649d9c85b7c9a44912d419aa5` (equal to Codex's manifest).
- **Preparation:** opaque original; non-generative alpha mask (Claude: birefnet-general mask (rembg, mask only) of the whole original, segmentation-birefnet-mask.png; levels 150..240; levels 150..240; the KIST, LG and KAPEX logos, the grey studio and the floor reflection are out); crop ROI [470, 30, 780, 818], alpha bounding box [45, 32, 264, 742], 20 px transparent padding; no RGB edit, no scaling. `prepared.png` sha256 `44505868ca17a8c9f95459dafdd654dc7d1a79882d059c194741b4a547a17e1a`, mask sha256 `c1b1dfa972d74e5b26de397f81f17fa0414a9c6490292d8103499b8c5508bc7e`.

## Catalogue identity

- **Record:** catalogue id 50, Lab "LG", Robot "KAPEX (co-developed with KIST and LG AI Research)".
- The render KIST supplied for the press on 30 September 2025, published by Herald Economy with the caption 'KIST provided' (native 1280 × 821); a contemporary ChosunBiz report calls the same image an artist rendering. It shows the whole robot with head, both hands and both feet. It is a concept render, not a photograph of hardware, and says nothing about later versions. The KIST, LG and KAPEX logos, the grey studio and the floor reflection are excluded by the alpha mask.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked with `ops/media/robots/review-intake.py`: every visible pixel's colour equals the original's at the same place; corners transparent; no thick semi-transparent region inside the robot; the WebP's alpha equals the PNG's.

## Published files (image batch 15, PR 249, merge 672539d, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/kist-kapex/kist-kapex-full-body.png`, 259 × 750 px, sha256 `44505868ca17a8c9f95459dafdd654dc7d1a79882d059c194741b4a547a17e1a` (= the prepared.png).
- **WebP:** `assets/robots/kist-kapex/kist-kapex-full-body.webp`, sha256 `9bb5c62f54d593ef35cef57f0a3f01d129e53b0beb447ac6005014f0e17530db`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
