# Robot image batch 12: integrated package

Integrated in this PR, not yet published. `mapping.json` lists the ten integrated images; `manifest.json` also keeps three prepared candidates that were left out (D9, Kuavo 4Pro and R-Noid, below).

## Integrated (ten)

| Record | Folder | Cutout | Visible caption |
|---|---|---|---|
| 67 Reachy 2 | `pollen-reachy2-single-arm/` | the manufacturer's own soft mask from the datasheet PDF (`source-mask.png`) | Pollen Robotics, Reachy 2 single-arm mobile-base configuration, technical render |
| 215 Forerunner K2 | `kepler-k2-biped/` | BiRefNet mask on the robot's region; annotation dots left outside | Kepler, K2 bipedal development version, manufacturer render |
| 47 Forerunner K1 | `kepler-k1/` | the original's own alpha, labels left out | Kepler, Forerunner K1 manufacturer render |
| 32 GR-1 | `fourier-gr1-robocup/` | BiRefNet mask | RoboCup 2024 team hardware specification, Fourier GR-1 technical render |
| 118 Vibe 01 | `vibe-01/` | BiRefNet mask | Vibe Robotics, Vibe 01 render |
| 107 Noble Machines platform | `noble-machines-platform/` | BiRefNet mask; the tote's translucent RGB kept as photographed | Noble Machines, unnamed platform |
| 128 ROBOTO Origin | `roboparty-roboto-origin/` | BiRefNet mask | RoboParty, ROBOTO Origin repository render |
| 99 THEMIS | `westwood-themis/` | the original's own alpha | Westwood Robotics |
| 91 Walker S1 | `ubtech-walker-s1/` | BiRefNet mask; the held tote kept as payload, the factory and floor reflection left out | UBTECH, Walker S1 with tote, manufacturer product image |
| 142 Walker S2 | `ubtech-walker-s2/` | BiRefNet mask on a region that keeps the whole right elbow and leaves out the battery cabinet | UBTECH, Walker S2 render |

Every visible pixel keeps the original's RGB at native resolution, with a 20 px transparent margin; nothing is enlarged or generated. Checked with `ops/media/robots/review-intake.py` (13/13). Its flat-background warning on K2 points at the black hip-actuator housings, which are part of the robot. `contact-sheet-light-dark.jpg` shows the ten on light and dark grounds.

Optical notes:
- **K1:** the helmet top and the soles reach the edges of the publisher's file only with their faint antialiased outline: no opaque pixel in either edge row, alpha at most 136 at the top and 176 at the bottom. Accepted by Codex as the whole rounded contour; nothing is extended.
- **Noble:** the robot and the warehouse seen through the translucent tote keep the colours of the photograph; no background is removed from behind it.

## Left out (prepared, kept as research)

- **D9 (155)** `pudu-d9-video/`: official video frame 31, 1920 × 1080. The dark background panel beside the torso has the same luminance as the dark torso (8 to 25) and cannot be separated by alpha alone. Replaced by Walker S2 (Codex, 27 Nov 2026).
- **Kuavo 4Pro (49)** `leju-kuavo-4pro/`: the whole render, but its forearms and hands are flat grey placeholders in the source. Left out; a new official image with articulated hands is in Codex's candidates-17 (Codex, 27 Nov 2026).
- **R-Noid (77)** `robotcom-rnoid-outdoor/`: frame 847 of the official video. R-Kiwi and most of its lid are excluded, but a one-pixel cyan line of the lid stays under the gripper and a reddish fringe of the door behind stays along the wrist. Left out and replaced by Walker S1; frame 908 is to be examined (Codex, 27 Nov 2026).

Sources: Codex's `candidates-12` (864fcbc), `candidates-13` (c4c8edb), `candidates-14` (6d1eb96: Walker S2 and Walker S1) and `candidates-15` (54f4cf5) on `codex/image-sources-remaining`, copied selectively.
