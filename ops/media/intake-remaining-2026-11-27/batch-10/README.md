# Robot image batch 10: published package

Published with PR 232 (reviewed head 5da90c9, CI 46043204343; merge 4db495d, Pages 46044425860, 27 Nov 2026) and verified in production by Claude and Codex. `mapping.json` is the current list of the ten integrated images; `manifest.json` also keeps two prepared candidates that were not integrated.

## Integrated (ten)

| Record | Folder | Cutout |
|---|---|---|
| 90 Torobo | `tokyo-robotics-torobo/` | Codex's ISNET cutout, unchanged |
| 101 Quanta X2 | `x-square-quanta-x2/` | Claude, BiRefNet mask of the original (`segmentation-birefnet-mask.png`); replaces a cutout that removed the dark face and kept a scan-grid line |
| 193 Bolt | `mirrorme-bolt/` | Claude, the lower of a BiRefNet mask and the original's own alpha; removes a dark haze in the arm gap |
| 197 DEX-M | `richtech-dex-m/` | Codex's cutout from the original alpha, unchanged |
| 139 H2 | `unitree-h2/` | Claude, BiRefNet; replaces a cutout that lost the raised arm and kept a spectator between the legs |
| 141 R1 | `unitree-r1/` | Claude, BiRefNet; without the grass fringe |
| 40 AEON | `hexagon-aeon/` | Codex's cutout of an official animation still, unchanged |
| 97 Calvin-40 | `wandercraft-calvin-40/` | Claude, original alpha levelled 120..250 (from candidates-11) |
| 207 Zerith H1 | `zerith-h1/` | Claude, original alpha (from candidates-11) |
| 198 REX G1 | `roboscience-rex-g1/` | Claude, BiRefNet on frame 0 of the official product video (from candidates-10-rex-g1) |

Every visible pixel keeps the original's RGB at native resolution, with a 20 px transparent margin; checked with `ops/media/robots/review-intake.py` (10/10). `contact-sheet-light-dark.jpg` shows the ten on light and dark grounds.

## Not integrated

- **D9 (155)** `pudu-d9/` and **Luna (156)** `limx-luna/`: whole and clean, but under the site's 500 px minimum height (208 × 475; frame 203 of the official animation, 300 × 371). Not enlarged; kept as research only. Both stay queued for a larger official source.
- **Igris (79)**: not prepared; which Robros robot the homepage image shows is not established.
- **Voxel Series-1 (131)**: the earlier portrait ends at the shins; a later whole source went to batch 11.

## Historical note (Codex's transport README, superseded)

> Ten candidates, not approved. Codex transports originals and provisional masks with exact RGB/native dimensions. Independent review and correction by Claude required. Quanta101 face/scan-line must be repaired or source replaced. D9 is whole but native400x480, quality debt; no upscaling. Confirm Igris79 identity from model-specific context. Render/configuration credits must name AEON animation still and DEX-M. […]

Quanta X2 was repaired (above); D9 was left out under the minimum height rather than published as quality debt.
