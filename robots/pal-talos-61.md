# Talos by PAL

[Canonical robot page](https://whyhumanoid.com/humanoids/pal-talos-61/) · [Method](https://whyhumanoid.com/method/)

Catalogue snapshot: 2026-11-27. Catalogue entries report what their sources say. Check the original source, date, model and test conditions. Missing values are left blank or marked as unknown.

## Before comparing

2 kHz control is not the AI decision frequency; payload is per extended arm

## Specifications

- **Height (cm)**: 175
- **Weight (kg)**: 95
- **Payload or carry (kg)**: 6 per fully extended arm
- **Runtime (hours)**: 1.5 walking / 3 standby
- **Walking speed (km/h)**: 3.6
- **Running speed (km/h)**: Not published
- **Unveiled**: 2017
- **Platform and mobility**: Bipedal humanoid with torque control
- **Degrees of freedom and grippers**: Configurable head and grippers
- **Sensors and compute**: IMU, encoders, wrist/ankle force-torque sensing; joint torque sensors with exceptions
- **Battery and charging**: 1.5 h walking / 3 h standby
- **Software**: ROS / ros\_control; Ubuntu LTS real-time OS
- **Voice**: Not disclosed
- **Clothed**: No
- **Autonomy and supervision**: ROS / ros\_control; real-time Ubuntu LTS; optional teleoperation / WBC

## Market

- **Price and availability**: Quote required; research hardware and software
- **B2B clients**: Not disclosed

## Company

- **Company country**: Spain
- **Listing**: Private
- **Valuation**: Not verified
- **Rounds**: Not verified
- **Investors**: Not verified
- **Careers**: https://pal-robotics.com/who-we-are/careers/

[Company profile](https://whyhumanoid.com/companies/pal/)

- [Website](<https://pal-robotics.com/robot/talos/>)
- [X](<https://x.com/PALRobotics>)
- [LinkedIn](<https://www.linkedin.com/company/pal-robotics/>)
- [YouTube](<https://www.youtube.com/watch?v=zQUufUEU83A>)

## Sources and checks

- **Last checked**: 2026-10-29
- **Checks recorded**: Funding verification pending; Specifications / identity reviewed (limitations in notes)
- **Model identity**: TALOS; research platform
- <https://pal-robotics.com/robot/talos/>
- <https://pal-robotics.com/robots/>

## Per-attribute verification

Standard: 1.0.0. The whole profile is not certified. Legacy payload and runtime strings remain unclassified until evidence establishes the metric and conditions.

HRL: Pending audit.

- **Sustained bilateral payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Peak bilateral payload**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Single-arm payload**: 6 kg; verification_tier=V2_Technical_Doc; verified_at=2026-11-27; conditions=6 kg with the arm stretched; OEM technical capacity, without duty duration or thermal protocol.; source=<https://pal-robotics.com/wp-content/uploads/2025/09/TALOS-DataSheet-1.pdf>.

- **Unclassified payload claim**: not_disclosed kg; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Payload test conditions**: not_disclosed; verification_tier=Pending_Audit; verified_at=null; conditions=not_disclosed.

- **Idle or light-duty runtime**: 3 h; verification_tier=V2_Technical_Doc; verified_at=2026-11-27; conditions=Stand-by only. Walking endurance is listed separately as 1.5 h; neither is a loaded manipulation cycle.; source=<https://pal-robotics.com/wp-content/uploads/2025/09/TALOS-DataSheet-1.pdf>.

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
