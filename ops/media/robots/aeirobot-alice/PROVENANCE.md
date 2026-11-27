# Alice (AeiROBOT): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 2, scope "A/B makers" (Javier, 27 Nov 2026; non-generative mask cutouts authorised).

## Source

- **Image:** AeiROBOT's. No open licence is presumed. The site credits it as "Image: AeiROBOT".
- **Page:** https://eng.arobot4all.com/ALICE4
- **File:** https://cdn.imweb.me/thumbnail/20251107/1f679c6ba92e9.png
- **Downloaded:** by Codex on 2026-11-27, carried without recompression on the transport branch `codex/image-sources-ab` (commit 28fef87) and kept in `ops/media/intake-ab-2026-11-27/batch-02/aeirobot-alice/`.
- **Original:** `original.png`, 1280 × 3240 px, RGBA, 1,513,401 bytes, sha256 `7b5fbfaa5ef57e16e11758061d8a6fbeb22b1546636442a5a057b05f961ab846` (equal to Codex's manifest).
- **Codex's preparation:** native transparency of the original; Codex only cropped it (20 px padding). Files `mask.png` and `prepared.png` (sha256 `064f7c3661aeb4b16097f119de3d0a21ec6aa6be0d58c794ec58feca0bad8e98`), checked by Codex on light and dark grounds.

## Catalogue identity

- **Record:** catalogue id 2, Lab "AeiROBOT", Robot "Alice".
- ALICE 4, from the official ALICE4 page. The record describes the bipedal ALICE 4/5; this is not the wheeled ALICE M1.

## Step here

`python3 ops/media/robots/trim.py ops/media/intake-ab-2026-11-27/batch-02/aeirobot-alice/prepared.png out.png --max-height 3300` (log in `trim-log.json`): crop to the visible figure with a 10 px margin; alpha and colour of every visible pixel unchanged; native resolution kept (no scaling).

Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 2, PR 202, merge 14dedcd, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/aeirobot-alice/aeirobot-alice-full-body.png`, 1295 × 3249 px, lossless, sha256 `56252aad88827d86c3c6845800335f46de02b2e0b623c82580ba52a1a950b711`.
- **WebP:** `assets/robots/aeirobot-alice/aeirobot-alice-full-body.webp`, made with `python3 ops/media/robots/to-webp.py`, sha256 `6d103fdc0133d36e8f1e6fe37611a4d75b7a34ba2881718e5f6a5c38f7322b20`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
