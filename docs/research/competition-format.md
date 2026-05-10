# Israeli school robotics competition — format research

**Researched**: 2026-05-10
**Source request**: parent question — "explore how the Israeli competition worked in past years, compare to what we built, identify gaps"

## TL;DR

- **The teacher's "press-count → behavior" idiom is a real Scribbler 3 feature, not an invention** — the S3 ships with 8 factory demos triggered by 2x..8x reset presses, and BlocklyProp lets you replace them with your own. The simulator's whole press-count UI is well-grounded. (HIGH confidence.)
- **No nationally-standardised "navigate A to B around obstacles" Scribbler competition exists in Israel that I can find.** The Israeli MoE / Skillz program for grades 4-6 supports Krypton, Fischertechnik, EV3, and the Edubot simulator — Scribbler is **not on the official list**. The Technion's road-safety "Robotraffic" competition starts at grade 4 but is autonomous-driving, not press-count. So this is almost certainly a **school-internal competition** the teacher designed, possibly inspired by the curriculum. (HIGH confidence on absence of standardised format; MEDIUM on it being teacher-designed.)
- **Biggest concrete gap**: the simulator is missing the BlocklyProp `drive_speed` block (independent left/right wheel speeds) and `drive a turn` (arc with radius). The user explicitly asked about these. They are heavily-used motion primitives in BlocklyProp curriculum and may be in the kid's class programs.

## Top 3 actionable findings

1. **Add `drive_wheels` (independent L/R speeds) and `drive_arc` (radius + angle) to the Step schema.** These are first-class BlocklyProp blocks. The user already flagged this in their question; my research confirms it is a real Parallax block, not a niche one.
2. **Ask the teacher for the cheat-sheet template and rule set.** Without standardised national rules, the teacher's specific scoring criteria (time? collisions? completion only?) is the *only* source of truth. Without this, "competition readiness" is impossible to verify.
3. **Verify the kid's class programs use the press-count idiom as we modelled it.** Standard BlocklyProp has the kid wrap each press-count handler in an `if reset_button_count == N` block in *one main program*. Our simulator treats each press-count as a separate "behavior" in a `Program.behaviors[]` array — this is a UX simplification that should match the kid's mental model, but worth verifying.

## Confidence levels

| Finding | Confidence | Why |
|---|---|---|
| S3 reset-button press count is a real platform feature with 8 slots | HIGH | Parallax learn.parallax.com tutorials directly document this |
| `drive_speed` (independent L/R wheels) is a standard S3 block | HIGH | Documented in Parallax block reference |
| `drive a turn` (arc) is a standard S3 block | HIGH | Documented in Parallax block reference |
| Israeli MoE / Skillz uses Krypton / Fischertechnik / EV3 / Edubot — NOT Scribbler | HIGH | Stated explicitly on official Skillz / pop.education.gov.il pages |
| Israeli MoE elementary robotics tasks are scenario-based ("mask challenge", "Dr. Hassan's clinic", "Corona pranks"), not generic A-to-B | MEDIUM | Found scenario names in Skillz portal article but not full rules |
| Robotraffic (Technion) is the closest national road-safety themed competition; grades 4-12 | HIGH | Multiple corroborating Technion / Times of Israel sources |
| Robotraffic uses *autonomous* sensor-driven driving, not press-count behaviors | HIGH | Press releases emphasise "robots move automatically" |
| The teacher's competition is school-internal (not affiliated with Skillz/Robotraffic) | MEDIUM | Inferred — no national format matches the WhatsApp description, and S3 isn't on the MoE list |
| Past-year debriefs / parent blogs about the specific competition | LOW | Found nothing specific; Israeli school WhatsApp groups don't surface publicly |
| Photos of actual competition boards | LOW | None found for this format |

## Competition format

### Big-picture takeaway

The teacher's WhatsApp description does not match any nationally-documented Israeli elementary competition I could find. The two adjacent national programs are:

- **Skillz / משרד החינוך "חשיבה מחשובית ורובוטיקה"** (Computational Thinking and Robotics) for grades 4-6: uses Krypton / Fischertechnik / EV3 / Edubot, scenario-based challenges ("אתגר המסכה", "הקליניקה של ד"ר חסן", "תעלולי קורון"), Scratch-based programming. Not Scribbler. Not press-count.
- **Robotraffic (Technion, Nadav Shoham)**: grades 4-12, road-safety themed (matches teacher's "emphasis on road safety"), arena has roads / intersections / traffic lights / signs. But: autonomous driving (no press-count), and uses custom Technion robot kits — not Scribbler.

**Best inference**: this is a **school-internal competition the teacher designed**, borrowing the road-safety theme from Robotraffic and using the Scribbler hardware they happen to have. The press-count idiom is a clever way to make autonomous behaviors selectable on the fly — it's a teaching choice that matches the S3's native capability.

### What we know with HIGH confidence

- **Format**: pre-programmed behaviors triggered by N×Reset presses; pair team navigates A→B; cheat-sheet permitted. (Source: WhatsApp.)
- **Hardware**: Parallax Scribbler 3, programmed in BlocklyProp Solo. (Source: parent.)
- **Date**: ~mid-June 2026. (Source: parent.)

### What we don't know (need teacher input — see Open Questions)

- Board physical size and material
- Obstacle types (boxes? traffic cones? printed cardstock?)
- A/B marker visual (taped X? coloured circle? cone?)
- Scoring: time-only? penalty for collisions? penalty for path inefficiency? bonus for not using cheat-sheet?
- Time limit per attempt
- Number of attempts allowed
- Whether sensor-reactive behaviors are encouraged or only deterministic distance/rotation

### What the cheat-sheet typically looks like

Inferred only. From the teacher's quote "each pair will get a sheet listing what each button press does as a reminder", the cheat-sheet is provided **by the team** (they wrote the programs, so they know the mapping) but printed by the teacher. Likely a small table:

| Press count | What it does |
|---|---|
| 2× | Drive forward 30 cm |
| 3× | Rotate right 90° |
| 4× | ... |

The simulator should be able to **export this cheat-sheet** so the kid can hand it in / print it. (See Recommendations.)

## Block primitives — gap analysis

Source: Parallax S3 block reference (https://learn.parallax.com/reference/scribbler-3-robot-block-reference/) plus the motors sub-page.

| Primitive | In BlocklyProp S3 | In our simulator (`schema.ts`) | Gap | Priority |
|---|---|---|---|---|
| `drive` (continuous, runs until stop) | yes | NO — we only have distance-bounded `drive` | Medium gap; useful for "drive forward until line sensor triggers" patterns | medium |
| `drive_speed` (independent L/R, optional duration) | yes — `-100..100` per side, optional 0..65535 ms | **NO** | **Yes — the user flagged this** | **HIGH** |
| `drive_distance` (cm/in/mm/encoder, sync stop) | yes — speed `1..100`% | yes (`Step.drive`, cm) — but no speed unit harmonisation | minor | low |
| `rotate` (in-place, 1..359°) | yes | yes (`Step.rotate`, degrees) | none | — |
| `drive_a_turn` (arc with radius + angle, radius 0 = in-place, ±radius = direction, angle -1080..1080°) | yes | **NO** | **Yes — second-most important motion block** | **HIGH** |
| `drive_to` (XY relative coordinate) | yes | NO | Probably unused at this age; pivots-then-moves is awkward UX | low |
| `stop driving` | yes | yes (`Step.stop`) | none | — |
| `reset_button_count` (read N from last reset) | yes — sensor block, value 1..8 | implicit (we model press-count as binding key, not as readable value) | **Conceptual mismatch** — see note below | medium |

### Conceptual mismatch on press-count modelling

In BlocklyProp, the kid writes **one** main program that contains a chain of `if reset_button_count == 2 do { ... } if reset_button_count == 3 do { ... }` branches. Up to 8 slots per the factory demo precedent.

Our simulator models each press-count as a **separate behavior** in `Program.behaviors[]`. This is cleaner for the kid (no nested if/else hell) but doesn't match the BlocklyProp source-of-truth. Two implications:

1. If the kid wants to import their class program directly (stretch goal in CLAUDE.md), we need to flatten the `if` chain into separate behaviors.
2. If the kid wants to share state between behaviors (unlikely at age 8 but possible — e.g., a "step counter" variable), our model can't represent it.

**Verdict**: keep the per-behavior model for UX, but document the constraint. The kid's class programs at age 8 are almost certainly stateless deterministic sequences.

### Sensor blocks (already covered, light review)

| Sensor | In S3 reference | In our simulator | Notes |
|---|---|---|---|
| Line sensor (left/right) | yes | yes | matches |
| Obstacle sensor (left/right, IR) | yes | yes | matches |
| Light sensor | yes (3-channel: left/centre/right) | partial — we have `light_above` with single threshold, no L/C/R | low gap unless kid uses light-following |
| Encoder counts | yes (used inside `drive_distance`) | implicit in physics | n/a — we don't expose encoder reads to user code |
| Microphone / sound | yes | NO | out of scope per CLAUDE.md |
| Reset button count | yes (1..8) | n/a (modelled at higher level) | see conceptual mismatch above |
| IR remote | yes | NO | out of scope, kid won't have remote |

## Comparison to current simulator

### What we got right

- Differential-drive physics — correct architectural choice for S3
- Press-count → behavior UI — directly matches S3 platform feature (8 slots possible)
- Bilingual Hebrew RTL UI — kid is a Hebrew speaker
- Sensor predicate language with `and`/`or`/`not` — flexible enough for the sensor-reactive behaviors the user described
- 1m × 1m board with A/B markers — reasonable default
- localStorage save — works for this scope (no cloud needed)

### What we missed

| Severity | Gap |
|---|---|
| HIGH | `drive_speed` (independent L/R wheel speeds) — explicitly asked by user |
| HIGH | `drive_arc` (`drive_a_turn`) — radius + angle |
| MEDIUM | Cheat-sheet print/export view — competition essential, not just nice-to-have |
| MEDIUM | The 8-slot ceiling isn't enforced or surfaced — should match S3's native limit |
| LOW | Continuous `drive` with no distance bound (run-until-stop pattern) |
| LOW | 3-channel light sensor (we have one channel) |

### What we got that the competition doesn't need (over-engineered)

- `wait` block in `Step` — useful but redundant since `drive 0cm` + duration is rarely how kids think
- Light sensor entirely — kid's competition is on a school floor, not light-tracking. Keep but de-prioritise.
- `repeat N times` — useful pedagogically but unlikely in pre-built press-count behaviors
- The `Program.version: 1` field — fine for serialisation but not user-visible

These don't hurt, just don't move the competition needle.

## Recommendations

### Must-have for competition readiness

1. **Add `drive_wheels` Step**: `{ kind: 'drive_wheels'; leftSpeedPct: number; rightSpeedPct: number; durationMs?: number }`. Range -100..100, duration optional 0..65535ms. This is the user-flagged block and it's a standard S3 primitive.
2. **Add `drive_arc` Step**: `{ kind: 'drive_arc'; radiusCm: number; degrees: number; speedPct?: number }`. Radius 0 = in-place spin (could subsume `rotate`), positive radius = right arc, negative = left arc. Maps cleanly to `drive_a_turn`.
3. **Cap behaviors at 8** in the editor UI (BlocklyProp's native limit). Currently nothing prevents the kid from defining behavior 99.
4. **Cheat-sheet print view**: a route or modal that renders behaviors as a printable table (Hebrew + English columns, large font, A4-sized). The kid hands this to the teacher on competition day.

### Should-have for practice quality

5. **Show robot bounding box prominently** when robot is near an obstacle (e.g., red highlight when bbox is within 2cm of obstacle). Common pitfall in physical robots: kids forget the robot has *width* and plan for the centre point only.
6. **"Last collision" indicator persistence** — currently a "stall" indicator is per AC; persist it after recovery so the kid can review where they hit.
7. **Time-to-completion display** + a "personal best" tracker per board. Matches likely scoring criterion.
8. **"What if?" mode** — pause the robot mid-run, change press-count, resume. Helps kid debug mid-program.

### Nice-to-have post-competition

9. Replay export (animated GIF or shareable JSON of the run trajectory)
10. Pen-down / Scribbler-Art mode (already on stretch list per CLAUDE.md)
11. Calibration panel (already on stretch list)
12. Import real BlocklyProp .svg / .xml programs (stretch — needs `if reset_button_count` → behavior flattening)

## Open questions for the parent

These need the teacher / kid to confirm — without them, several recommendations above are guesses.

1. **What scoring rule wins?** Pure time? Time + collision penalties? "First team to finish without crashing"? This determines whether collision-handling needs to be punitive in the simulator or just informative. *(High priority — affects UI feedback design.)*
2. **What's on the cheat-sheet template?** Does the teacher provide a template the team fills in, or do teams design their own? If templated, the simulator's cheat-sheet export should match the format the kid will see on competition day. *(Medium priority — easy to change later.)*
3. **What blocks are taught in class?** Specifically: did the teacher cover `drive_wheels` (independent speeds) and `drive_a_turn` (arcs)? Or is the curriculum limited to `drive_distance` + `rotate`? If the latter, our gap is theoretical. *(High priority — determines whether the gap-fix recommendations 1 & 2 above are essential or optional.)*
4. **How big is the physical board?** Cardboard? Painter's tape on classroom floor? If 1m × 1m our default matches; if 2m × 1.5m, the kid's mental scale will be wrong. *(Medium priority.)*
5. **What do the obstacles look like physically?** Books? Boxes? Traffic cones? If 3D objects with non-trivial height, the kid's IR obstacle sensor matters. If flat tape, only the bounding box matters. *(Low priority — simulator can show generic rectangles either way.)*
6. **Are sensor-reactive behaviors expected, or only deterministic sequences?** A kid programming `drive forward until line sensor triggers` is fundamentally different from `drive forward 30cm`. *(Medium priority — affects which blocks to highlight in the editor.)*
7. **Is there a time limit per attempt?** If yes, the simulator should display a countdown timer matching the real one. *(Medium priority.)*
8. **Are the press-count slots really 2..N (skipping 1)?** S3's factory demos use 2..8. The teacher's WhatsApp says "2x = behavior A, 3x = behavior B" suggesting same convention. Worth a one-line confirmation. *(Low priority — current code aligns with S3 convention.)*

## Sources

Primary (HIGH-value):

- [Parallax S3 Block Reference index](https://learn.parallax.com/reference/scribbler-3-robot-block-reference/) — confirmed motor block category exists
- [Parallax S3 Motors block page](http://learn.parallax.com/support/reference/scribbler-3-robot-block-reference/actions/motors) — full parameter table for `drive`, `drive_speed`, `drive_distance`, `rotate`, `drive_a_turn`, `drive_to`. Authoritative source for gap analysis.
- [Parallax: Using Reset as Part of a Program](https://learn.parallax.com/tutorials/robot/scribbler-robot/getting-started-blocklyprop-s3/using-reset-part-program) — confirms 1..8 reset-press slot pattern, factory demo precedent
- [Skillz / משרד החינוך — תחרויות בחשיבה מחשובית ורובוטיקה](https://pop.education.gov.il/tchumey_daat/madaei-mahshev-robotika/yesodi/oraat-madaey-mahshev/competitions-robotics/) — official MoE elementary competition page. Confirms grades 3-6, scenario-based tasks (mask, clinic, etc), supports Krypton/Fischertechnik/EV3/Edubot. Hebrew. *(Translated gist: yearly challenge for grades 3-6, mixes Scratch animations and robotics, uses Krypton/Fischertechnik/EV3 or Edubot simulator. No mention of Scribbler.)*
- [Skillz — תחרות חשיבה מחשובית ורובוטיקה (finals article)](https://pub.skillz-edu.org/portal/articles/crb-finals/) — listed COVID-era scenario challenges ("אתגר המסכה" / Mask Challenge, "הקליניקה של ד"ר חסן" / Dr Hassan's Clinic, "תעלולי קורון" / Corona Pranks)
- [Edubot simulator official MoE page](https://pop.education.gov.il/tchumey_daat/madaei-mahshev-robotika/yesodi/noseem_nilmadim/edubot-robotics/) — confirms 20cm grid squares, ultrasonic sensor, tank-drive + steering-drive modes, includes "line follow", "pinball", "fire" challenges. Hebrew. *(Useful comparator: real MoE simulator uses 20cm grid; our 1m × 1m default board would be a 5×5 grid in their convention.)*

Secondary (corroborating):

- [Technion — Robotraffic press release 2012](https://www.technion.ac.il/en/2012/03/robotraffic-the-third-international-robotics-competition-designed-to-impart-safe-driving-and-road-safety-habits-to-be-held-at-the-technion/) — establishes road-safety + autonomous-driving + grades 4-12 format. Closest national equivalent to teacher's theme but format differs.
- [Technion International — Nadav Shoham Robotraffic](https://int-technion.ussl.co.il/programs/robotraffic/) — current iteration; teams 1-8 students; categories include safe driving, racing, knowledge of laws.
- [Mechanical Engineering Faculty — Leumi Robotics Center](https://meeng.technion.ac.il/en/leumi-robotics-center-2/) — host of Robotraffic; grades 4-12.
- [Parallax Scribbler 3 product page](https://www.parallax.com/product/scribbler-3-s3-robot/) — confirms BlocklyProp is the official environment, encoders are exposed.
- [Robotix Israel](https://www.robotix.co.il/) — Israeli vendor; lists FLL, VEX, Smart City, "1LINE" courses. No Scribbler curriculum found here.

Negative findings (worth noting):

- **No Israeli school newsletter, parent blog, or YouTube video** found documenting a Scribbler-specific A-to-B press-count competition. The teacher's competition appears school-internal.
- **No Hebrew-language Scribbler curriculum** found on Skillz, edum.org.il, or pop.education.gov.il.
- **No standardised rule sheet** (board size, scoring, time limits) found for the format described in the teacher's WhatsApp message. Recommendations dependent on these are flagged as such.
