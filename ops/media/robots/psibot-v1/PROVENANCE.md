# PsiBot V1 (PsiBot): full-body image, provenance and trim

Not published from here: `ops/` is excluded from the site. Image batch 1 (Javier, 27 Nov 2026: batches of 10, transparent background, whole robot).

## Source

- **Image:** PsiBot's. No open licence is presumed. The site credits it as "Image: PsiBot". Authorised by Javier for popular robots (23 Nov 2026).
- **Page:** https://www.psibot.ai/en/products/product_psibot-v1/
- **File:** https://psibot-data.oss-us-west-1.aliyuncs.com/website/Websource/Products/Introduction/PsiBot_V1/PsiBot_SynRobot.png
- **Downloaded:** by Codex on 27 Nov 2026, unmodified, and carried without recompression on the transport branch `codex/psibot-v1-original` (commit 438d1de, which holds only this file). A chat attachment of the same image had arrived re-encoded (2000 × 1994 WebP) and was not used.
- **Original kept here:** `PsiBot_SynRobot.png`, 2820 × 2812 px, RGBA PNG (alpha 0 to 255), 1,691,403 bytes, sha256 `8d5b4fb67e34f6961b82f8ff140a372e270fe93423b91c53c72345decd9d6cdc`. This is the SHA-256 Codex recorded for the download, so the bytes are the official file's.
- **Checked by Codex:** the whole robot including base, fingers and wheels; clean transparency on light and dark grounds; no props or extra text.

## Catalogue identity

- **Record:** catalogue id 196, Lab "PsiBot", Robot "PsiBot V1": a dual-arm humanoid upper body with waist and neck on a mobile base.
- The image is the product image of the official PsiBot V1 page; the torso carries the PsiBot mark.

## Trim here (no alpha change)

The original already carries real transparency, so no cutout was made. `python3 ops/media/robots/trim.py PsiBot_SynRobot.png out.png --max-height 2600` only crops to the visible figure with a 10 px margin (log in `trim-log.json`: crop box [958, 194, 1956, 2638]). The figure is under the 2600 px cap, so it keeps its native resolution: nothing is scaled.

- Every pixel with alpha above 0 keeps its alpha and colour exactly (checked on 27 Nov 2026); no visible pixel lies outside the crop.
- Fully transparent pixels have their colour set to 0.
- Nothing is repainted, generated, extended or thresholded.

## Files integrated (image batch 1, PR not yet merged)

- **PNG:** `assets/robots/psibot-v1/psibot-v1-full-body.png`, 998 × 2444 px, lossless, sha256 `39e73de674190e87d32c86d6cee4d2890b0be72896d2cb894d4b208ca643c42f`.
- **WebP:** `assets/robots/psibot-v1/psibot-v1-full-body.webp`, made with `python3 ops/media/robots/to-webp.py` (quality 90, lossless alpha; its alpha equals the PNG's), sha256 `b2e14746350c2e7ff09f0a7f9783672e4aeb034049a5e4ba084a86bb0a406aca`. The page loads the WebP; the PNG is the fallback.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
