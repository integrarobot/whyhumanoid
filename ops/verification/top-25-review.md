# Initial 25-model verification review

Updated: 2026-11-27

This is a source-screening baseline, not 25 completed deep audits. Selection spans product types, operating claims and regions; it is not an objective global ranking. Every model was examined across payload, energy runtime, task autonomy and industrial maturity.

The initial pass recorded 25 conservative V1 attribute claims. A second documentary pass adds generation-specific customer and formal technical sources for selected models. Current counts, evidence tiers and bounded HRL assessments are derived from the validated ledger by `node tools/export-verification-report.mjs`; they are reported in the baseline JSON. No rated-load duty-cycle estimate or independent physical performance audit is asserted. Unknown and conflicting conditions remain explicit.

The machine-readable source notes and the initial coverage report are [audit-cohort.json](../../data/verification/audit-cohort.json) and [report-quarterly.json](../../data/verification/report-quarterly.json). Claims prepared for the append-only registry are [claims.json](../../data/verification/claims.json).

| Model | Principal follow-up | Primary source |
|---|---|---|
| 1X NEO (Home Robot) | Separate carry, lift and arm ratings. | [Manufacturer](https://www.1x.tech/neo) |
| Agility Digit 5 (in development) | Obtain generation-specific paid-operation evidence. | [Manufacturer](https://www.agilityrobotics.com/solutions/digit-5) |
| Apptronik Apollo 2 | Obtain Apollo 2 payload and endurance protocol. | [Manufacturer](https://apptronik.com/apollo/apollo-2) |
| Boston Dynamics Atlas (industrial electric) | Obtain bilateral and thermal test protocol. | [Manufacturer](https://bostondynamics.com/products/atlas/) |
| Figure Figure 03 | Obtain payload and loaded-runtime conditions. | [Manufacturer](https://www.figure.ai/figure) |
| Tesla Optimus Gen 2 | Resolve Gen 2 source/version mapping. | [Manufacturer](https://www.tesla.com/SI) |
| Sanctuary AI Phoenix | Recover Phoenix-specific archived evidence. | [Manufacturer](https://sanctuary.ai/) |
| Unitree G1 | Separate G1/EDU posture-dependent load limits. | [Manufacturer](https://www.unitree.com/g1/) |
| Unitree H1 | Never transfer H1-2 ratings to H1. | [Manufacturer](https://www.unitree.com/h1/) |
| Ubtech Walker S2 | Independently verify hot-swap timing and operating load. | [Manufacturer](https://www.ubtrobot.com/en/humanoid/products/walker-s2) |
| Agibot A2 (A2 Ultra / A2 Lite) | Keep Ultra and Lite endurance separate. | [Manufacturer](https://www.agibot.com/products/A2_Ultra) |
| Fourier GR-1 | Resolve documentation configuration and battery figures. | [Manufacturer](https://support-old.fftai.com/docs/GR-X-Humanoid-Robot/GR1/GR-1_Introduction/) |
| Leju Kuavo | Inspect image-based version-specific technical data. | [Manufacturer](https://www.lejurobot.com/en/products/kuavo-my) |
| LimX Oli | Obtain loaded endurance and replacement method. | [Manufacturer](https://www.limxdynamics.com/en/products/oli) |
| Booster T1 | Recover T1-specific documentation after redirects. | [Manufacturer](https://www.booster.tech/cn) |
| Engineai PM01 | Obtain PM01 EDU loaded-runtime protocol. | [Manufacturer](https://en.engineai.com.cn/open/docs/pm01/01/product-overview?entry=docs&product=pm01) |
| Kepler Forerunner K2 | Review rendered source and archive K2 specifications. | [Manufacturer](https://www.gotokepler.com/productDetailK2?id=2) |
| PAL Talos | Keep standby and walking endurance separate. | [Manufacturer](https://pal-robotics.com/robot/talos/) |
| Neura 4NE1 (Gen 4 announced) | Resolve payload range and Gen 4 mapping. | [Manufacturer](https://neura-robotics.com/products/4ne1/) |
| Hexagon AEON | Distinguish announced pilots from paid operation. | [Manufacturer](https://hexagon.com/about/news-media/press-releases/2340225/hexagon-launches-aeon-a-humanoid-built-for-industry) |
| Wandercraft Calvin-40 | Recover current product source and customer operating evidence. | [Manufacturer](https://www.youtube.com/watch?v=YddS-aI097Q) |
| Pollen Reachy 2 | Distinguish teleoperation from application autonomy. | [Manufacturer](https://pollen-robotics.com/reachy-2/) |
| The Humanoid HMND 01 (Alpha Wheeled / Bipedal) | Keep wheeled/bipedal and POC/commercial evidence separate. | [Manufacturer](https://thehumanoid.ai/) |
| Rainbow RB-Y1 | Resolve A/M configuration and per-arm test. | [Manufacturer](https://rainbow-robotics.com/en/products/rb-y1/) |
| Addverb Elixis | Keep battery target and wheeled ratings separate. | [Manufacturer](https://addverb.ai/humanoid-robot-elixis) |

## Interpretation

No-data is not zero capacity. No HRL assignment is not a finding of no deployment. Research availability, future delivery plans, field trials and paid operation are different claims. All registry entries require source preservation; archive completion must be recorded separately from source consultation.

## Next audit pass

Obtain version-specific technical sheets and operational customer evidence, inspect the image/JavaScript sources, recover changed or removed pages, and record archived captures. Prioritize disclosed test duration, reach, load, sample size, intervention exposure, paid-pilot terms and externally operated deployments. Preserve every retraction and correction.
