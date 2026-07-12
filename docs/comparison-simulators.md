# Benchmark: Scribbler Simulator vs. Children's Robot Simulators

Research date: 2026-07-12 (deep-research agent, sources verified online; unverified items marked).

## Headline findings

- **No other Scribbler S3 simulator exists.** BlocklyProp Solo (Parallax's official S3 block editor) has no simulation capability — it compiles to Propeller C and requires USB hardware. The S3 itself is discontinued ("no longer available" per parallax.com). The only S3-adjacent sim ever was RobotBASIC (Windows, BASIC text language, generic 2D sim) — not kid-appropriate, not browser-based.
- **Our fidelity is above the kid-sim field** (Ozobot, Sphero, iRobot Root), on par with Open Roberta Lab and Gears, below Webots (which is not age-appropriate anyway). No other sim models encoders + stall + differential drive from vendor specs for this robot.
- **Difficulty tiers were our biggest gap vs. the field** — Ozobot ships 5 block-complexity modes, iRobot Root 3 convertible levels, CoderZ Junior/Pro divisions. Tiering by _block vocabulary_ is the proven pattern. → Closed by the grade-mode feature (GradeConfig, 2026-07-12).

## Comparison table

| Simulator                | Age      | Blocks                    | Physics fidelity                                        | Board authoring                           | Competition mode                                | Tiers                       | Line following  | Availability              |
| ------------------------ | -------- | ------------------------- | ------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- | --------------------------- | --------------- | ------------------------- |
| **Ours**                 | 8+       | Blockly 11, S3 vocabulary | 2D differential drive, encoders, stall, spec-calibrated | Board editor + random solvable maze (BFS) | Press-count actuation, A/B, cheat-sheet, replay | **3 grade modes** (2026-07) | Yes (2 IR bool) | Local, private, he-RTL+en |
| Open Roberta Lab (NEPO)  | 8+       | Blockly-based             | 2D diff drive, multi-sensor                             | Custom field upload                       | Via uploaded fields                             | Multi-robot, not graded     | Yes             | Free, open source         |
| VEXcode VR               | Gr. 3+   | Blocks + Python           | 3D, drivetrain/gyro/eye                                 | Fixed playgrounds                         | Activity library                                | Free/Enhanced/Premium       | Yes             | Freemium ($199-499/yr)    |
| iRobot Coding (Root)     | K-12     | 3 convertible levels      | 3D SimBot, simple                                       | Limited                                   | Lessons                                         | **3 levels**                | Yes             | Free                      |
| MakeCode micro:bit       | 8+       | Blocks + text             | Board-only (no driving)                                 | N/A                                       | N/A                                             | Blocks→text                 | No              | Free, OSS                 |
| OzoBlockly sim           | K-8      | **5 modes** icon→Master   | Simple 2D line bot                                      | Preset lines                              | ShapeTracer                                     | **5 modes**                 | Core mechanic   | Free                      |
| Gears/GearsBot           | 10+      | Blockly→Python            | 3D Babylon.js                                           | Configurable worlds                       | Challenges (line/maze/sumo)                     | By challenge                | Yes             | Free, OSS                 |
| Sphero Edu virtual       | 8+       | Blocks only               | Simple roll model                                       | No                                        | No                                              | On hardware only            | No              | Free beta                 |
| Robot Virtual Worlds     | MS/HS    | ROBOTC                    | 3D                                                      | FLL/VEX tables                            | Yes                                             | Curriculum                  | Yes             | **Dead (2021)**           |
| Virtual Robotics Toolkit | FLL      | EV3-G                     | High 3D LEGO                                            | FLL/WRO mats                              | Yes                                             | No                          | Yes             | Paid, NXT/EV3 only        |
| CoderZ (IL)              | Gr. 5-12 | Blockly + Python          | Cloud 3D                                                | Missions                                  | **CRCC national league**                        | Junior/Pro                  | Yes             | Commercial SaaS           |
| Miranda (IRAI)           | K-12     | Scratch + Python          | 3D multi-robot                                          | Premium only                              | Exercises                                       | Per robot                   | Yes             | Commercial                |
| Webots                   | Uni+     | No                        | High (physics engine)                                   | Full                                      | Research                                        | No                          | Yes             | OSS desktop               |

## Robotraffic (Technion) verified facts

- Categories: Careful Driving, Extended Careful Driving, Racing, Reverse Parking, Traffic Safety Initiatives, regulations test, 3D CAD, control basics. Junior divisions exist (on-campus + virtual) but **junior rules are not public** — the grade-4/5 grid formats come from the school/teacher, not Technion. The teacher's board diagram remains the authoritative source for grade-4/5 specifics.
- Senior track: highway model 900×450 cm (450×450 virtual), **50 mm black line**, traffic lights/signs/barriers, cars ≤425×210 mm with **Ackermann steering** (not differential). Penalty-point scoring (e.g., 4 pts for missing a red light); prescribed turn patterns ("right, straight, right, straight") are scored.
- Israel's MoE elementary robotics competitions (Skillz, gr. 3-6) explicitly allow simulator-or-hardware — precedent for simulator practice.

## Fidelity audit vs. real S3 (verified against Parallax sources)

| Aspect           | Real S3                                                         | Sim (after 2026-07-12 fixes)                                                                                     |
| ---------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Wheel spacing    | 153 mm (`scribbler.spin` `DEFAULT_WHEEL_SPACE=153`)             | **0.153 m ✓ (fixed from 0.105)**                                                                                 |
| Encoder scale    | ~0.5 mm/count → ~2019 ticks/m (507.4 counts/rev)                | **2019 ✓ (fixed from 340)**                                                                                      |
| Block vocabulary | drive distance / rotate / drive speed L-R / drive a turn / stop | 1:1 match (`drive to` XY dead-reckoning intentionally omitted)                                                   |
| Line sensors     | 0–100 analog reflectivity                                       | Boolean (analog upgrade = deferred stretch)                                                                      |
| Light sensors    | 3 phototransistors L/C/R                                        | One aggregate 0-255 forward cone (documented simplification)                                                     |
| Top speed        | Not published by Parallax                                       | 0.15 m/s (plausible, uncalibrated — hidden calibration panel remains the plan)                                   |
| Collision        | —                                                               | AABB for rect obstacles (heading-agnostic; robot is small — documented approximation); capsule for walls/corners |

## Deferred recommendations (from this research)

1. Analog 0–100 line-sensor value block (top tier only) with boolean threshold wrapper for lower grades — enables proportional line following like Open Roberta teaches.
2. "Right, straight, right, straight" prescribed-turn exercise boards + stop-sign/traffic-light stop zones (`stopzone` element + dwell check) on the figure-8.
3. Challenge ladder (5–10 scaffolded missions per grade with star scoring) — the single biggest engagement feature the field has that we lack; cheap given board schema + replay infrastructure.
4. Oriented-box collision if 45° practice feel demands it (current AABB error is minor at this robot size).
5. `escapeXmlAttr` in `buildToolboxXml` before any user-controlled strings ever reach the toolbox template (security-gate hardening note).
