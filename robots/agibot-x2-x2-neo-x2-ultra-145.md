# X2 (X2 Neo / X2 Ultra) by Agibot

[Canonical robot page](https://whyhumanoid.com/humanoids/agibot-x2-x2-neo-x2-ultra-145/) · [Method](https://whyhumanoid.com/method/)

Catalogue snapshot: 2026-11-27. Catalogue entries report what their sources say. Check the original source, date, model and test conditions. Missing values are left blank or marked as unknown.

## Before comparing

2 m/s is lab; typical ≤0.8 m/s. Arm payload ≤1 kg over full range. Company says use-case images do not confirm customer deployments

## Specifications

- **Height (cm)**: 131
- **Weight (kg)**: ~35 (Neo); ~39 (Ultra)
- **Payload or carry (kg)**: Up to 3 in specific poses; ≤1 over full range of motion (per arm)
- **Runtime (hours)**: ~2 (walking at 0.5 m/s)
- **Walking speed (km/h)**: Typically ≤2.9 (≤0.8 m/s); up to 7.2 (2 m/s) in lab
- **Running speed (km/h)**: Not disclosed
- **Unveiled**: 2025-05-22 (X2 launch / on sale, Yicai)
- **Platform and mobility**: Compact bipedal humanoid for tours, reception and events
- **Degrees of freedom and grippers**: 30 (Neo) / 31 (Ultra) body: head 1-2, arms 7 each, waist 3, legs 6 each; optional hands +10 active +6 passive = 47
- **Sensors and compute**: Ultra: RGB, stereo RGB, RGB-D, rear-view cameras, LiDAR; 2× RK3588; optional Jetson Orin NX 16 GB (157 TOPS)
- **Battery and charging**: ~500 Wh; replaceable; ≤1.5 h charge (10-100%); autonomous low-battery return (Ultra)
- **Software**: WITA-Omni (interaction) and AGILE (perception-control) models; LinkSoul, LinkCraft, SkillForge; SDK; OTA
- **Voice**: Yes; microphone array, wireless mic, speaker; head display with 30+ expressions
- **Clothed**: No
- **Autonomy and supervision**: Autonomous navigation, obstacle recovery, low-battery return; demos labelled illustrative (company)

## Market

- **Price and availability**: Price not disclosed (contact sales). Warranty 8 months (Neo) / 18 months (Ultra)
- **B2B clients**: Not disclosed

## Company

- **Company country**: China
- **Listing**: Private
- **Careers**: Not found

[Company profile](https://whyhumanoid.com/companies/agibot/)

- [Website](<https://www.agibot.com/products/X2>)
- [X](<https://x.com/AgiBot_zhiyuan>)
- [LinkedIn](<https://www.linkedin.com/company/agibot/>)
- [YouTube](<https://www.youtube.com/channel/UCuKcqTxz_fe1PbrsIAQXr5A>)

## Public deployment cases

- [ASD](https://whyhumanoid.com/deployments/agibot-asd-retail-network-2026/)

## Sources and checks

- **Last checked**: 2026-11-19
- **Checks recorded**: Specifications / identity reviewed (limitations in notes)
- **Model identity**: AGIBOT X2 Neo and X2 Ultra (new version), agibot.com/products/X2 accessed 2026-11-19
- <https://www.agibot.com/products/X2>

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
