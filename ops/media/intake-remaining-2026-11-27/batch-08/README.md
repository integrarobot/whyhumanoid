# Image batch 8: prepared cutouts for review (27 Nov 2026)

Not integrated and not published. Scope: all missing robot images (Javier, 27 Nov 2026). Prepared by Claude for Codex's review before integration.

- **Sources:** Codex's packages on `codex/image-sources-remaining` (3096468 and 299a0d7, `candidates-08/`), unchanged; Adam (66) from PNDbotics' official repository github.com/pndbotics/pnd_models, file `adam_standard/imgs/adam_standard.png` (added in commit 71eaac7, 9 May 2025, unchanged since; the copy here is byte-identical to the repository blob, nothing was rendered here).
- **Per record:** `original.*` (the source file as delivered; for RoBee, the RGB image extracted from the PDF), `mask-roi.png` (the alpha computed over the ROI) and `prepared.png` (the cutout). Geometry, hashes and the alpha method are in `manifest.json`; the proposed alt text, identity and quality notes are in `mapping.json` (the input of `ops/media/robots/integrate-batch.py`).
- **Method:** `ops/media/robots/prepare-cutout.py`. Alpha only: every visible pixel keeps the original's RGB at the same place, at native resolution, with a 20 px transparent border; nothing generated or scaled. Clean transparent originals keep their own alpha (Nylo, LUS2, pib#5); Mentee's own alpha is levelled (175..250) to drop a violet glow; Kinisi's own alpha is limited by a segmentation mask (opaque white inside the gaps); opaque originals use a segmentation mask (BiRefNet general through rembg, mask only).
- **Checks:** `python3 ops/media/robots/review-intake.py ops/media/intake-remaining-2026-11-27/batch-08 <out>` passes all ten (hashes, native size, RGB equal to the original, transparent corners, no thick semi-transparent region). Two soft regions listed for inspection were accepted after viewing: the faint contact shadow under LUS2's feet and the soft inner edge of MenteeBot's left arm.
- **Contact sheet:** `contact-sheet-light-dark.jpg` (light and dark grounds).

## Left out of this batch

- **Kuavo (49) and R-Noid (77):** each transparent original reaches the top edge of its file at the head, so a complete head cannot be shown. They stay queued.
- **Nadia frontal PNG (43-detail15):** reaches the bottom and side edges of its file; the complete crouching photograph (43-detail14) is used instead.

## Identity uncertainties stated in the mapping

- **LUS (52):** the image is LUS2; the record is the LUS family, generation unspecified.
- **MenteeBot (55):** the image is v3; the record's specifications are not attributed to gen 3.
- **RoBee (60):** the image is Series R; the record is RoBee in its industrial mobile-base configuration.
- **pib (65):** the image is pib#5; the record is a platform of variable configuration.
- **Adam (66):** a simulation model rendering of adam_standard, not a hardware photograph. Which variant the record describes is not established. Codex decides whether it stays.
