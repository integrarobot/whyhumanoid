# PM01 by Engineai

[Canonical robot page](https://whyhumanoid.com/humanoids/engineai-pm01-150/) · [Method](https://whyhumanoid.com/method/)

Catalogue snapshot: 2026-11-27. Catalogue entries report what their sources say. Check the original source, date, model and test conditions. Missing values are left blank or marked as unknown.

## Before comparing

Max torque 164 N·m is peak. Speed is "hardware supported"

## Specifications

- **Height (cm)**: 140
- **Weight (kg)**: ~44 (Education) / ~44.5 (Navigation)
- **Payload or carry (kg)**: Not disclosed
- **Runtime (hours)**: 2
- **Walking speed (km/h)**: Not disclosed
- **Running speed (km/h)**: &gt;7.2 (&gt;2 m/s, hardware supported)
- **Unveiled**: 2024-12-24 (PM01 launch, company)
- **Platform and mobility**: Bipedal humanoid; waist rotation &gt;300°
- **Degrees of freedom and grippers**: 24: 1 neck, 6 per leg, 1 waist, 5 per arm
- **Sensors and compute**: Two ultra-wide binocular cameras (head and waist); 3D LiDAR on Navigation edition; 8-core CPU + Orin NX
- **Battery and charging**: Quick-release smart battery; 2 h full charge (54.6 V / 4.5 A)
- **Software**: Open-source training and deployment code; ROS deployment framework; NVIDIA Jetson Orin NX (16G)
- **Voice**: Yes
- **Clothed**: No
- **Autonomy and supervision**: Learned locomotion (sim-trained, motion capture + adversarial learning); autonomy level not quantified

## Market

- **Price and availability**: Price not disclosed
- **B2B clients**: Not disclosed

## Company

- **Company country**: China
- **Listing**: Private
- **Careers**: https://www.engineai.com.cn/career.html

[Company profile](https://whyhumanoid.com/companies/engineai/)

- [Website](<https://en.engineai.com.cn/product-pm01>)
- [X](<https://x.com/engineairobot>)
- [LinkedIn](<https://www.linkedin.com/company/engineai-robotics/>)

## Sources and checks

- **Last checked**: 2026-11-19
- **Checks recorded**: Specifications / identity reviewed (limitations in notes)
- **Model identity**: EngineAI PM01, 2026 Education and Navigation editions, en.engineai.com.cn/product-pm01 accessed 2026-11-19
- <https://en.engineai.com.cn/product-pm01>

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

- **Unclassified runtime claim**: 2 h; verification_tier=V2_Technical_Doc; verified_at=2026-11-27; conditions=PM01 EDU approximate battery life; loaded task is unspecified. Technical-document evidence does not make it rated-load endurance.; source=<https://en.engineai.com.cn/open/docs/pm01/01/product-overview?entry=docs&product=pm01>.

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
