# H2 by Unitree

[Canonical robot page](https://whyhumanoid.com/humanoids/unitree-h2-139/) · [Method](https://whyhumanoid.com/method/)

Catalogue snapshot: 2026-11-27. Catalogue entries report what their sources say. Check the original source, date, model and test conditions. Missing values are left blank or marked as unknown.

## Before comparing

Rated 7 kg vs peak 15 kg arm payload: use rated value for tasks. Base H2 does not support secondary development. Leg joint 360 N·m is peak torque

## Specifications

- **Height (cm)**: 182 (spec table; marketing copy says 180)
- **Weight (kg)**: ~70
- **Payload or carry (kg)**: Arm: ~7 rated / ~15 peak
- **Runtime (hours)**: ~3
- **Walking speed (km/h)**: Not separately identified as walking
- **Running speed (km/h)**: ≥7.2 max speed (≥2 m/s, manufacturer)
- **Unveiled**: 2025-10-20 (H2 unveiling, Unitree launch video)
- **Platform and mobility**: Full-size bipedal humanoid with bionic head with facial features
- **Degrees of freedom and grippers**: 31 total: 6 per leg, 7 per arm, 3 waist, 2 head; EDU adds optional dexterous hands
- **Sensors and compute**: Wide-FOV humanoid binocular camera; Intel Core i5 (+ i7 on EDU); optional high-power module (e.g. Thor)
- **Battery and charging**: 15 Ah (0.972 kWh), quick-release; ~3 h
- **Software**: Unitree SDK (EDU only); OTA; PC1 Intel Core i5 (platform), PC2 Intel Core i7 (custom development, EDU)
- **Voice**: Array microphone + high-power speaker
- **Clothed**: No
- **Autonomy and supervision**: Motion control and OTA-updated algorithms; autonomy level not quantified

## Market

- **Price and availability**: USD 29,900 for H2 (tax and shipping excluded, manufacturer page accessed 2026-11-19); H2 EDU: contact sales. Warranty 8 months (H2) / 12 months (EDU)
- **B2B clients**: Not disclosed

## Company

- **Company country**: China
- **Listing**: SSE:688836 (since 2026-08-19)
- **Careers**: https://www.unitree.com/position/

[Company profile](https://whyhumanoid.com/companies/unitree/)

- [Website](<https://www.unitree.com/H2/>)
- [X](<https://x.com/UnitreeRobotics>)
- [LinkedIn](<https://www.linkedin.com/company/unitreerobotics/>)
- [YouTube](<https://www.youtube.com/@unitreerobotics>)

## Public deployment cases

- [Bawei Tong (八维通)](https://whyhumanoid.com/deployments/unitree-h2-baweitong-substation/)

## Sources and checks

- **Last checked**: 2026-11-19
- **Checks recorded**: Specifications / identity reviewed (limitations in notes)
- **Model identity**: Unitree H2 and H2 EDU, unitree.com/H2 accessed 2026-11-19
- <https://www.unitree.com/H2/>

## Per-attribute verification

Standard: 1.0.0. The whole profile is not certified. Legacy payload and runtime strings remain unclassified until evidence establishes the metric and conditions.

HRL: Pending audit.

- **Sustained bilateral payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Peak bilateral payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Single-arm payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Unclassified payload claim**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Payload test conditions**: not_disclosed; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Idle or light-duty runtime**: not_disclosed h; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Runtime under rated load**: not_disclosed h; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Unclassified runtime claim**: not_disclosed h; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

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
