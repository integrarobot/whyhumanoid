# Atlas (industrial electric) by Boston Dynamics

[Canonical robot page](https://whyhumanoid.com/humanoids/boston-dynamics-atlas-industrial-electric-16/) · [Method](https://whyhumanoid.com/method/)

Catalogue snapshot: 2026-11-27. Catalogue entries report what their sources say. Check the original source, date, model and test conditions. Missing values are left blank or marked as unknown.

## Before comparing

IP67; −20 to 40 °C claimed; distinguish instantaneous/sustained loads and specification-sheet CE claim

## Specifications

- **Height (cm)**: 190
- **Weight (kg)**: 90
- **Payload or carry (kg)**: 30 sustained; 50 instantaneous; 20 one-handed
- **Runtime (hours)**: 4; 2 with heavy lifting
- **Walking speed (km/h)**: Not published in this specification sheet
- **Running speed (km/h)**: Not published in this specification sheet
- **Unveiled**: Industrial version: exact date unverified
- **Platform and mobility**: Electric bipedal humanoid
- **Degrees of freedom and grippers**: 56 DoF; tactile fingers and palms
- **Sensors and compute**: 360° vision; tactile sensors
- **Battery and charging**: Autonomous swap: 3 min; charging: 1.5 h
- **Software**: Orbit integration with MES/WMS; autonomous, VR and tablet modes
- **Voice**: Not disclosed
- **Clothed**: No
- **Autonomy and supervision**: Autonomous, VR teleoperation and tablet control

## Market

- **Price and availability**: Commercial contact; no price in specification sheet
- **B2B clients**: Announced testing customers: Hyundai Motor Group (parent company; Atlas training at its Metaplant Application Center, 2026) and GlobalFoundries (onsite testing planned from early 2027; first customer outside automotive, per Boston Dynamics 2026-11-17)

## Company

- **Company country**: USA
- **Listing**: Private
- **Valuation**: USD 1,100M (2021 transaction value; historical)
- **Rounds**: Control acquisition closed 2021-06-21. On 2026-07-16, Hyundai announced plans to buy SoftBank's remaining stake; not a VC round.
- **Investors**: Hyundai Motor Group (control); SoftBank (selling shareholder). Purchase of the remaining stake announced in 2026; closing unverified.
- **Careers**: https://bostondynamics.com/careers/

[Company profile](https://whyhumanoid.com/companies/boston-dynamics/)

- [Website](<https://bostondynamics.com/products/atlas/>)
- [X](<https://x.com/BostonDynamics>)
- [LinkedIn](<https://www.linkedin.com/company/boston-dynamics/>)
- [YouTube](<https://youtu.be/-e1_QhJ1EhQ>)

## Public deployment cases

- [Hyundai Motor Group](https://whyhumanoid.com/deployments/bd-atlas-hmgma-rmac-2026/)
- [GlobalFoundries](https://whyhumanoid.com/deployments/bd-atlas-gf-2027/)

## Sources and checks

- **Last checked**: 2026-10-29
- **Checks recorded**: Funding checked (scope in notes); Specifications / identity reviewed (limitations in notes)
- **Model identity**: Industrial Atlas; specification sheet dated 2025-12-23
- <https://www.hyundai.com/worldwide/en/newsroom/detail/0000001225.html>
- <https://bostondynamics.com/wp-content/uploads/2026/01/atlas-spec-sheet.pdf>
- <https://bostondynamics.com/products/atlas/>
- <https://bostondynamics.com/news/boston-dynamics-globalfoundries-expand-robotics-collaboration/>

## Per-attribute verification

Standard: 1.0.0. The whole profile is not certified. Legacy payload and runtime strings remain unclassified until evidence establishes the metric and conditions.

HRL: HRL_3.

- **Sustained bilateral payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Peak bilateral payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Single-arm payload**: 20 kg; verification_tier=V2_Technical_Doc; verified_at=2026-11-27; conditions=One-handed capacity; exact reach, duration and thermal protocol not disclosed.; source=<https://bostondynamics.com/wp-content/uploads/2026/01/atlas-spec-sheet.pdf>.

- **Unclassified payload claim**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Payload test conditions**: 30 kg sustained; 50 kg instantaneous; 20 kg one-handed text; verification_tier=V2_Technical_Doc; verified_at=2026-11-27; conditions=Document distinguishes load categories; bilateral configuration, repeated-duty cycle and thermal limits not disclosed.; source=<https://bostondynamics.com/wp-content/uploads/2026/01/atlas-spec-sheet.pdf>.

- **Idle or light-duty runtime**: not_disclosed h; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Runtime under rated load**: not_disclosed h; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Unclassified runtime claim**: 4 h; verification_tier=V2_Technical_Doc; verified_at=2026-11-27; conditions=General battery life; task and load unspecified. Separate heavy-lifting statement is two hours, without a load percentage.; source=<https://bostondynamics.com/wp-content/uploads/2026/01/atlas-spec-sheet.pdf>.

- **Charging time**: not_disclosed h; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Battery swap mechanism**: not_disclosed; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Battery swap time**: 3 min; verification_tier=V2_Technical_Doc; verified_at=2026-11-27; conditions=Published autonomous-change duration; station and workload test protocol not disclosed; this does not establish hot swapping.; source=<https://bostondynamics.com/wp-content/uploads/2026/01/atlas-spec-sheet.pdf>.

- **Task autonomy level**: not_disclosed; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Task success rate**: not_disclosed %; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Number of trials**: not_disclosed trials; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Task environment**: not_disclosed; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Mean time between interventions**: not_disclosed min; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Speed relative to a human**: not_disclosed ratio; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Source video speed multiplier**: not_disclosed x; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

Comparison caveats: Do not compare peak, single-arm or unclassified payload directly with sustained bilateral payload. Only sustained bilateral payload is eligible for the default payload comparison; undisclosed values are excluded. Runtime requires the same workload and charging interval; a battery figure alone is not shift availability. Success rates require the same task, environment, autonomy level, protocol and sample-size context. A grade describes one source-backed attribute, never the entire robot. Missing evidence is not evidence of absence.
