# G1 by Unitree

[Canonical robot page](https://whyhumanoid.com/humanoids/unitree-g1-138/) · [Method](https://whyhumanoid.com/method/)

Catalogue snapshot: 2026-11-27. Catalogue entries report what their sources say. Check the original source, date, model and test conditions. Missing values are left blank or marked as unknown.

## Before comparing

Base G1 does not support secondary development; arm load varies greatly with posture

## Specifications

- **Height (cm)**: 132
- **Weight (kg)**: ~35 (G1); 35+ (G1 EDU)
- **Payload or carry (kg)**: ~2 per arm (G1); ~3 (G1 EDU); varies with arm posture
- **Runtime (hours)**: ~2
- **Walking speed (km/h)**: Not disclosed
- **Running speed (km/h)**: Not disclosed
- **Unveiled**: 2024-05-13 (G1 introduction)
- **Platform and mobility**: Bipedal humanoid; foldable (690×450×300 mm folded)
- **Degrees of freedom and grippers**: 23 total (6 per leg, 1 waist, 5 per arm); EDU 23-43 with optional Dex3-1 three-finger hand (7 DoF) and extra waist/wrist DoF
- **Sensors and compute**: Depth camera + 3D LiDAR; 8-core CPU; EDU optional high-compute module (e.g. Orin)
- **Battery and charging**: 9,000 mAh quick-release smart battery (13S); charger 54 V 5 A; ~2 h
- **Software**: Unitree SDK (EDU, secondary development); OTA; UnifoLM; imitation and reinforcement learning
- **Voice**: 4-mic array + 5 W speaker
- **Clothed**: No
- **Autonomy and supervision**: Locomotion and motion control learned by imitation/RL; manipulation and autonomy depend on user development (EDU)

## Market

- **Price and availability**: USD 13.5K for G1 base (tax and shipping excluded, manufacturer page accessed 2026-11-19); G1 EDU: contact sales. Warranty 8 months (G1) / 18 months (EDU)
- **B2B clients**: Not disclosed

## Company

- **Company country**: China
- **Listing**: SSE:688836 (since 2026-08-19)
- **Careers**: https://www.unitree.com/position/

[Company profile](https://whyhumanoid.com/companies/unitree/)

- [Website](<https://www.unitree.com/g1/>)
- [X](<https://x.com/UnitreeRobotics>)
- [LinkedIn](<https://www.linkedin.com/company/unitreerobotics/>)
- [YouTube](<https://www.youtube.com/@unitreerobotics>)

## Public deployment cases

- [Unitree Robotics](https://whyhumanoid.com/deployments/unitree-x1-own-factory-2026/)
- [NC State University (AIR Lab)](https://whyhumanoid.com/deployments/unitree-g1-ncstate-howl/)

## Sources and checks

- **Last checked**: 2026-11-19
- **Checks recorded**: Specifications / identity reviewed (limitations in notes)
- **Model identity**: Unitree G1 (base) and G1 EDU, unitree.com/g1 accessed 2026-11-19; G1-A / G1-D / G1+ / G1-Comp / G1-Boxing are separate application variants not covered here
- <https://www.unitree.com/g1/>

## Per-attribute verification

Standard: 1.0.0. The whole profile is not certified. Legacy payload and runtime strings remain unclassified until evidence establishes the metric and conditions.

HRL: Pending audit.

- **Sustained bilateral payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Peak bilateral payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Single-arm payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Unclassified payload claim**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Payload test conditions**: G1 maximum arm load approximately 2 kg; G1 EDU approximately 3 kg text; verification_tier=V1_OEM_Claim; verified_at=2026-11-27; conditions=Maximum arm load varies with arm extension; not a sustained bilateral or nominal-duty rating.; source=<https://www.unitree.com/g1/>.

- **Idle or light-duty runtime**: not_disclosed h; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Runtime under rated load**: not_disclosed h; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Unclassified runtime claim**: 2 h; verification_tier=V1_OEM_Claim; verified_at=2026-11-27; conditions=Approximate OEM battery life; G1 base; task and load not disclosed.; source=<https://www.unitree.com/g1/>.

- **Charging time**: not_disclosed h; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Battery swap mechanism**: not_disclosed; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Battery swap time**: not_disclosed min; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Task autonomy level**: not_disclosed; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Task success rate**: not_disclosed %; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Number of trials**: not_disclosed trials; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Task environment**: not_disclosed; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Mean time between interventions**: not_disclosed min; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Speed relative to a human**: not_disclosed ratio; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Source video speed multiplier**: not_disclosed x; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

Comparison caveats: Do not compare peak, single-arm or unclassified payload directly with sustained bilateral payload. Only sustained bilateral payload is eligible for the default payload comparison; undisclosed values are excluded. Runtime requires the same workload and charging interval; a battery figure alone is not shift availability. Success rates require the same task, environment, autonomy level, protocol and sample-size context. A grade describes one source-backed attribute, never the entire robot. Missing evidence is not evidence of absence.
