# Mirokai (Enchanted): full-body image, provenance and preparation

Not published from here: `ops/` is excluded from the site. Image batch 6, scope "E/F makers" (Javier, 27 Nov 2026; non-generative mask cutouts, original RGB).

## Source

- **Image:** Enchanted Tools - Mirokaï robot's. No open licence is presumed. The site credits it as "Image: Enchanted Tools - Mirokaï robot".
- **Page:** https://enchanted-tools.notion.site/Miroka-Explorer-Suit-Studio-247d56e2479680e2a63ad584350fb015?pvs=25
- **File:** https://enchanted-tools.notion.site/image/attachment%3A688035d6-41a6-408e-9072-92314262218b%3AStill_2025-08-06_101409_1.1.20.jpg?table=block&id=247d56e2-4796-804f-81a9-e834d18efc6e&spaceId=214cc2c7-3563-4ada-955b-928c5c369400&width=1410&userId=&cache=v2&imgBuildSrc=requestProxiedImageUrl
- **Context (Codex):** Miroki (yellow character) of the Mirokai robot family, from the official Mirokai Explorer Suit Studio gallery. Complete robot including rolling sphere and protective ring. Not a different unnamed humanoid.
- **Downloaded:** by Codex on 27 Nov 2026, carried without recompression on the transport branch `codex/image-sources-ef` (commit 195020a) and kept in `ops/media/intake-ef-2026-11-27/batch-06/mirokai/`.
- **Original:** `original.jpg`, 2048 × 1152 px, RGB, 105,918 bytes, sha256 `228ea6908575dcbced3c6d768c3f9bd2201214743dd1c9728d14086a2ab4d242` (equal to Codex's manifest).
- **Codex's preparation:** opaque original; non-generative alpha mask (Alpha-only mask, right ear restored by manual alpha polygon after automatic mask omitted it. Original RGB unchanged.); crop ROI [480, 0, 1050, 1152], alpha bounding box [47, 62, 467, 1077], 20 px transparent padding; no RGB edit, no scaling. Files `prepared.png` (sha256 `77fedd1a9a1fa8ce91cadaf0984814bb6fd031999167d24fa73bfcbf09f9202c`) and the mask (sha256 `01c29215249f9c203666f06fce57763a48b21dad5dce9e247a2cb595c018eca1`), reviewed by Codex on light and dark grounds (`review-light-dark.jpg`).

## Catalogue identity

- **Record:** catalogue id 26, Lab "Enchanted", Robot "Mirokai".
- Miroki, the yellow character of Enchanted Tools' Mirokai robot family, from the official "Mirokai Explorer Suit Studio" gallery (Enchanted Tools media room on Notion): the complete robot with its rolling sphere and protective ring, both ears whole (the right ear restored by Codex in alpha only). Not another unnamed humanoid. The media room allows photo use with credit and asks for notification: with Javier's express authorisation, Codex notified Enchanted Tools through the official contact form (https://enchanted.tools/contact) on 27 Nov 2026 and saw the confirmation "Thank you for contacting us." The notice claims no affiliation, and none is claimed here.

## Step here

`prepared.png` is used as delivered, at its native resolution (no trim, no scaling); only the WebP twin is made (`python3 ops/media/robots/to-webp.py`). Checked on 27 Nov 2026: every visible pixel's colour equals the original's at the same place; corners transparent; the WebP's alpha equals the PNG's.

## Published files (image batch 6, PR 216, merge b24a276, verified in production on 27 Nov 2026)

- **PNG:** `assets/robots/enchanted-tools-mirokai/enchanted-tools-mirokai-full-body.png`, 460 × 1055 px, sha256 `77fedd1a9a1fa8ce91cadaf0984814bb6fd031999167d24fa73bfcbf09f9202c` (= Codex's prepared.png).
- **WebP:** `assets/robots/enchanted-tools-mirokai/enchanted-tools-mirokai-full-body.webp`, sha256 `f2ca154c05fb6f0333294b14a9a60f0c57306dd3f9cf76291b7dc411a77e9a40`.
- **Display:** the robot page shows it with `object-fit: contain` at its own proportions, with alt text and credit.
