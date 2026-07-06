# Scribbler Simulator — Initial Backlog

**Source request**: build a browser-based simulator for the Parallax Scribbler 3 robot so an 8-year-old can practice for an Israeli school robotics competition (target: mid-June 2026).

**Scope source**: project-owner conversation 2026-05-10. Stack and constraints in `.claude/CLAUDE.md`. Robot research summary linked from this doc.

**Tier**: 3 (complex — new codebase, multiple sub-systems, novel domain).

## Decomposition rationale

The competition format is _navigate A→B by sequencing pre-programmed behaviors via reset-button press counts_. The kid has already programmed his behaviors in class (BlocklyProp Solo). So the simulator decomposes into:

1. A **board + physics + UI shell** (Item 1) — the foundational layer; without it nothing is observable
2. A **block editor** (Item 2) — Blockly workspace where the kid re-creates his class behaviors and binds them to press-counts
3. A **sensor simulation layer** (Item 3) — required because the kid uses both deterministic AND sensor-reactive behaviors
4. A **bilingual UI** (Item 4) — Hebrew + English with RTL toggle, first-class per CLAUDE.md
5. **Practice features** (Item 5) — board editor, multiple boards, time tracking, replay; daily-practice usefulness

Items 1 and 4 should run mostly in parallel (Item 1 includes minimal English-only UI; Item 4 makes all strings translatable). Items 2 and 3 are sequentially coupled — block contracts in Item 2 drive the sensor implementation in Item 3.

---

## Backlog Item: MVP simulator core

**Type**: `feature`
**Priority**: `P0-critical`
**Estimate**: `L` (cross-cutting, foundational, touches 6+ files)
**Repo**: `scribbler-simulator`

### User Story

As an 8-year-old practicing for the robotics competition, I want to see a virtual Scribbler robot move on a board when I click virtual reset buttons, so that I can rehearse navigating from point A to point B before the real competition.

### Background & Context

This is the foundational layer everything else builds on. Without a working differential-drive sim and a press-count button UI, no other phase delivers value. We hardcode 4 sample behaviors here so the rest can be tested end-to-end before the block editor (Item 2) lands.

### Acceptance Criteria

- [ ] Given a fresh app load, when the user views the page, then a 2D top-down board (1m × 1m equivalent) renders with a robot at point A (top-left) and a labelled goal at point B (bottom-right)
- [ ] Given the robot is rendered, when nothing has been clicked, then the robot's heading is visually distinguishable (front edge marked) and the robot's footprint matches the S3's real proportions (~19cm × 16cm scaled to board units)
- [ ] Given 4 hardcoded behaviors are bound to press-counts 2× through 5× (forward 30cm, backward 30cm, rotate 90° right, rotate 90° left), when the user clicks "Press Reset 2×", then the robot drives forward 30cm in board units within 2s of click-time, with smooth interpolation
- [ ] Given the robot is moving, when its bounding box would intersect an obstacle, then it stops at the collision point and emits a "stall" visual indicator
- [ ] Given the robot reaches point B (centre within 5cm tolerance), then a "well done" overlay appears with elapsed time
- [ ] Given a "Reset board" button, when clicked, then the robot returns to point A with original heading
- [ ] All existing tests pass; no regressions
- [ ] No new critical/high security warnings

### Out of Scope

- Block editor (Item 2)
- Sensor-reactive behaviors (Item 3)
- Multiple boards (Item 5)
- Hebrew UI (Item 4)
- Sound effects, LED animation

### Technical Notes

- Differential drive physics in `src/sim/physics.ts`. Pure functions, deterministic.
- Renderer in `src/sim/renderer.ts` (or `src/components/BoardCanvas.tsx`), Canvas2D, requestAnimationFrame loop with fixed-step physics (60Hz physics, render every frame).
- Behaviors in `src/sim/behaviors/hardcoded.ts` as TS objects: `{ pressCount, label, steps: Step[] }` where `Step` = discriminated union (drive | rotate | stop | beep | …).
- Press-button UI in `src/components/PressButtons.tsx`. Buttons hardcoded for now; will be data-driven in Item 2.
- Board layout in `src/sim/boards/default.ts` — single hardcoded board with two obstacles + A/B markers.

---

## Backlog Item: Block editor for behavior definition

**Type**: `feature`
**Priority**: `P1-high`
**Estimate**: `L`
**Repo**: `scribbler-simulator`

### User Story

As an 8-year-old, I want to drag-and-drop blocks to define what the robot does when I press the reset button N times, so that the simulator matches the program I built in class.

### Background & Context

The kid programmed his class robot with BlocklyProp Solo. The simulator must let him re-create the same behavior set. Once defined, behaviors persist across sessions (localStorage) so he doesn't lose work between practice sessions.

### Acceptance Criteria

- [ ] Given an "Edit behaviors" mode, when the user enters it, then a Blockly workspace renders with a tab-strip for press-counts 2× through 8× (selectable)
- [ ] Given a press-count tab is selected, when the user drags blocks from the toolbox onto the workspace, then a behavior program is built; toolbox includes at minimum: `drive_distance(cm)`, `rotate_degrees(°)`, `stop()`, `beep()`, `wait(seconds)`, `repeat(times) { ... }`
- [ ] Given a defined behavior, when the user switches back to simulator mode and clicks the matching press-count button, then the robot executes the user's program (not the hardcoded fallback)
- [ ] Given the user closes the browser and reopens the app, then their behavior definitions are restored from localStorage
- [ ] Given a malformed or empty behavior, when the user clicks the corresponding press-count button, then a friendly inline message ("nothing to do — drag blocks here") appears instead of a crash
- [ ] Given a "Reset to defaults" button, when clicked, then the user is asked to confirm before behaviors are wiped
- [ ] All existing tests pass; no regressions
- [ ] No new critical/high security warnings

### Out of Scope

- Sensor-reactive blocks (Item 3 — adds them to the toolbox after this item ships)
- Importing real BlocklyProp Solo `.svg` files (deferred post-competition)
- Sharing/exporting programs

### Technical Notes

- Block vocabulary mirrors BlocklyProp Solo (https://learn.parallax.com/reference/scribbler-3-robot-block-reference/)
- Block code generator emits the same `Step[]` interface from Item 1 → runtime is unchanged
- localStorage key: `scribbler-sim:programs:v1` (versioned for future migrations)
- Use Blockly's built-in JSON serialization for program persistence
- Validate persisted shape on load (Zod or hand-rolled type guards) — see security AC in design doc

---

## Backlog Item: Sensor simulation + reactive blocks

**Type**: `feature`
**Priority**: `P1-high`
**Estimate**: `M`
**Repo**: `scribbler-simulator`

### User Story

As an 8-year-old whose class behaviors include line-following and obstacle-avoiding ones, I want the simulator to support sensor reads so my full program works the same way it works on the real robot.

### Background & Context

The teacher's curriculum mixes deterministic (drive distance) and reactive (line follow, obstacle avoid) behaviors. Items 1–2 cover deterministic; this item adds the sensor-read primitives plus the physics-layer simulation that makes them meaningful.

### Acceptance Criteria

- [ ] Given the physics engine, when the robot's underside crosses a `painted-line` board element, then `line_sensor_left()` and/or `line_sensor_right()` return `true` (left/right based on which sensor is over the line, with sensor offsets matching S3 mechanical placement)
- [ ] Given a board element of type `obstacle`, when the obstacle is within 15cm of the front of the robot AND within ±30° of the heading, then `obstacle_left()` or `obstacle_right()` return `true` (matching the S3's IR pair geometry)
- [ ] Given a board element of type `light_source`, when the source is within the 90° front-cone of the robot, then `light_sensor()` returns a value in [0..255] proportional to inverse-square distance
- [ ] Given the block editor, when sensor blocks (`line_sensor_left/right`, `obstacle_left/right`, `light_sensor`, `button_pressed`) are present in the toolbox, then they can be combined with `if/else`, `repeat_until`, and `while` blocks to form reactive programs
- [ ] Given a reactive program (e.g. "while not line_sensor_left() drive 1cm"), when run in the simulator, then the robot follows a painted line on the board (deviation from line < 2cm at the 5cm/s default speed)
- [ ] All existing tests pass; no regressions
- [ ] No new critical/high security warnings

### Out of Scope

- Microphone sensor (rare in beginner programs)
- Stall sensor as a readable block (handled by collision in Item 1)
- Sensor noise/calibration (sensors return clean values; real-world noise post-MVP)

### Technical Notes

- Board elements in `src/sim/boards/schema.ts` as a discriminated union: `LineSegment | Obstacle | LightSource | StartMarker | GoalMarker`
- Sensor reads are pure functions of `(robotState, board)`; called during the physics tick
- Sensor offsets from robot center: line sensors at front-bottom ±3cm lateral; IR sensors at front ±4cm angled outward (validated against Parallax Start-Up Guide PDF)
- `while` block bounded by a `maxIterations` cap (e.g. 10000 ticks) to prevent infinite loops in kid-authored programs

---

## Backlog Item: Bilingual UI (Hebrew + English with RTL)

**Type**: `feature`
**Priority**: `P1-high`
**Estimate**: `M`
**Repo**: `scribbler-simulator`

### User Story

As an 8-year-old Hebrew speaker, I want to use the simulator in Hebrew so the labels feel familiar and reading isn't a barrier to practicing.

### Background & Context

Every user-facing string must be translatable. The kid is most comfortable in Hebrew but will use both. This item finalises the i18n infrastructure (i18next) and ships full Hebrew translations alongside English. RTL layout when Hebrew is selected.

### Acceptance Criteria

- [ ] Given the app has loaded, when the user toggles a language switch (visible top-right), then all UI strings change between English and Hebrew without page reload
- [ ] Given Hebrew is selected, when the user views any screen, then the layout direction is `rtl` (toolbox on the right, controls mirrored), and Latin numerals/units (cm, °) remain LTR-embedded
- [ ] Given a fresh visit, when the browser locale starts with `he`, then Hebrew is the default; otherwise English is the default
- [ ] Given the language toggle is changed and the page is reloaded, then the previously-selected language is restored from localStorage
- [ ] Given Blockly's built-in block labels, when Hebrew is active, then block labels are localised (Blockly ships `blockly/msg/he.js` — wire it up)
- [ ] Given any UI string, when developing the project, then it must come from `src/i18n/{he,en}.json` (a CI grep gate detects hardcoded user-facing strings in `src/components/*.tsx`)
- [ ] All existing tests pass; no regressions
- [ ] No new critical/high security warnings

### Out of Scope

- Right-aligned Hebrew typography in Blockly's program code generator (accept what the library provides)
- Translation of error messages from third-party libraries (English fallback OK)
- Additional languages beyond He/En

### Technical Notes

- `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- Namespace per feature: `simulator`, `editor`, `boards`, `common`
- HTML `dir` attribute toggled via React effect on `<html>`; CSS uses logical properties (`margin-inline-start`) where possible
- Hebrew Blockly pack: `blockly/msg/he.js`
- Recommend Item 4 land in parallel with Item 1 (string-keys defined alongside component creation)

---

## Backlog Item: Practice features (board editor, multiple boards, time tracking)

**Type**: `feature`
**Priority**: `P2-medium`
**Estimate**: `M`
**Repo**: `scribbler-simulator`

### User Story

As a parent supervising practice, I want to create different board layouts and see how long my son took to navigate each, so I can vary the challenge and track his improvement.

### Background & Context

Once the kid can define behaviors and run them, daily practice value comes from variety (multiple boards) and feedback (time tracking, replay). Without these, he'd practice the same scenario over and over.

### Acceptance Criteria

- [ ] Given a "Boards" panel, when the user views it, then a list of boards appears with thumbnails (default + user-created); selecting one loads it into the simulator
- [ ] Given a "New board" button, when clicked, then a board editor opens with a blank board, a palette of element types (obstacle, line segment, A marker, B marker, light source), and drag-to-place + drag-to-resize interactions
- [ ] Given a custom board is saved, when the user reopens the app, then the board is preserved in localStorage and appears in the boards panel
- [ ] Given a run completes (robot reaches B), when the success overlay appears, then the elapsed time and number of button presses are displayed; both are saved to a per-board run history
- [ ] Given a per-board run history, when the user views it, then their last 10 attempts are listed with time, presses, and success/fail
- [ ] Given a "Replay" button on a run, when clicked, then the robot re-runs the same sequence on the same board (deterministic — physics tick is reproducible from the input log)
- [ ] All existing tests pass; no regressions
- [ ] No new critical/high security warnings

### Out of Scope

- Cloud sync / sharing boards
- Replay export to file (stretch goal)
- Procedurally-generated practice boards

### Technical Notes

- Board schema validated with the same parser as Item 3
- localStorage keys: `scribbler-sim:boards:v1`, `scribbler-sim:runs:v1`
- Run history capped at 10 per board to bound storage (1MB cap target across all keys)
- Replay implemented by recording `{ tickIndex, action }` log during a run; replay feeds log back into the same physics loop

---

## Prioritisation

| #   | Title              | Priority | Estimate | Why Now                                                                                                   |
| --- | ------------------ | -------- | -------- | --------------------------------------------------------------------------------------------------------- |
| 1   | MVP simulator core | P0       | L        | Foundational; nothing else delivers value without it. Must be first.                                      |
| 2   | Block editor       | P1       | L        | Mirrors the kid's actual class workflow. Without this, behaviors are demo-only.                           |
| 3   | Sensor simulation  | P1       | M        | Required by the kid's mixed deterministic/reactive program style. Depends on block contracts from Item 2. |
| 4   | Bilingual UI       | P1       | M        | Hebrew is the kid's primary language. Should run in parallel with Item 1 if capacity allows.              |
| 5   | Practice features  | P2       | M        | Daily-practice usefulness. Not blocking competition readiness if it slips.                                |

---

## PO Handoff

- Items written: 5
- Total AC: 29 (user-derived only — boilerplate AC excluded)
- Out-of-scope items: 16 (across all 5 items)
- Issues created: none — no issue tracker configured (project is local-only per CLAUDE.md)
- Recommended next agent: `/architect` (Tier 3)
- HITL flags:
  - `clarification: kid's actual class block vocabulary is unverified — proceeded with standard BlocklyProp Solo per project-owner directive 2026-05-10. If the teacher's reference sheet of press-count→behavior mappings becomes available, re-validate Item 2 toolbox against it.`
  - `capacity-risk: 4-week timeline + 5 items (2 L, 3 M) is tight — Item 5 (P2) may slip to post-competition; flagged P2 deliberately so it is the natural cut.`

```
[AGENT:product-owner | COMPLETE | items=5 | total-ac=29 | out-of-scope-items=16 | hitl-flags=2 | tier-recommendation=3]
```
