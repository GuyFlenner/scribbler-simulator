# Scribbler Simulator — SDLC Status

**Last updated**: 2026-07-12
**Current state**: Grade-based competition modes shipped (Grade 4 / Grade 5 / Grades 7-9, mirroring the real Robotraffic tiers photographed at the June 2026 competition). S3 calibration corrected from Parallax driver sources. Benchmark research: this is the only S3 simulator in existence (`docs/comparison-simulators.md`).
**Active backlog item**: none — grade backlog drained; stretch items listed in comparison doc §Deferred

---

## Session timeline (2026-07-12) — grade modes

| Commit    | What                                                                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(M5)`    | feat(challenges): challenge ladder — 7 missions across the grades, 1-3 star scoring from run records (presses/time/bonus), Challenges tab, stars in the goal overlay                                    |
| `(M4)`    | feat(sim): analog 0-100 line reflectivity (real S3 semantics) + proportional follow_line block in the grade 7-9 toolbox; starter press 5; tighter-corridor validation                                   |
| `a0baba9` | docs: simulator benchmark study (comparison-simulators.md) + this status update                                                                                                                         |
| `07bc9a9` | fix(grade): serpentine is the grades-7-9 default (figure-8 X defeats the bang-bang follower — review-gate finding); boardWallSegments memo; CLAUDE.md vocabulary correction                             |
| `38ca713` | feat(sim): grades 7-9 — line tracks (figure-8 + serpentine, 50mm line), follower starter, WHEEL_BASE_M 0.153 / TICKS_PER_M 2019 calibration fix, OOB float-epsilon fix                                  |
| `b166721` | feat(board): grade 5 — wall/corner elements, capsule collision, diagonal board, 8-connected generator option, board-editor tools                                                                        |
| `e20d328` | feat(grade): GradeConfig + selector + grade-filtered toolbox + grade-aware snapHeading + autofill fixes (loadStarter all-8-slots, externalRevision remount, workspaceJson persistence, set_led removal) |
| `39d398c` | style: prettier-format tracked .memory-backup docs (pre-existing CI breaker)                                                                                                                            |

Snapshot after this session: **303 tests (282 unit + 21 browser)**, strict TS 0 errors, lint/format clean. Quality gates: Security APPROVED (no conditions); Code Review REPAIR → fixed in `07bc9a9`.

Key architecture addition: `src/grade/config.ts` is the single source of truth for everything grade-dependent (snap increment, toolbox, starters, bundled boards, 🎲 connectivity). Grade selection lives in `src/store/grade-store.ts` (`scribbler-sim:grade:v1`); switch side-effects live in `GradeSelector.tsx` only.

---

## Session timeline (2026-05-10)

15 commits since branch start. Listed newest first:

| Commit    | What                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------- |
| `10b3cc9` | feat(test): Phase 2 — 9 deep browser tests (canvas pixels, boards lifecycle, i18n)                      |
| `dd1073f` | feat(test): Phase 1 — Vitest browser-mode smoke tests + competition research doc                        |
| `9b1e608` | fix(editor): infinite-mount loop freezing the browser when entering Edit behaviors                      |
| `6279c5f` | fix: rotate/arc direction labels — positive degrees is RIGHT (was LEFT)                                 |
| `39da8f6` | feat: drive_wheels, drive_arc, 8-slot cap, printable cheat-sheet                                        |
| `327f8a3` | ux: pentagon robot, 🚩/🏁 markers, 🪨 obstacles, distinct empty-button styling                          |
| `9e95b1f` | docs: design proposal for browser-based UI test layer (Vitest browser mode)                             |
| `771d406` | perf+i18n: lazy-load editor/boards (89 KB gzipped first-paint), board thumbnails, Hebrew Blockly labels |
| `b6f1fba` | feat(boards): Item 5 — multi-board support, run history, and replay                                     |
| `6d8616a` | feat(i18n): Item 4 — bilingual UI (English + Hebrew with RTL)                                           |
| `6e0834e` | chore: ignore tsbuildinfo, .history, local Claude settings                                              |
| `416d29d` | feat(sim): Item 3 — sensor simulation + reactive blocks                                                 |
| `94ef6c8` | feat(editor): Item 2 — Blockly block editor for behavior definition                                     |
| `53f0a8a` | feat(sim): Item 1 — MVP simulator core                                                                  |
| `28769b6` | chore: fix scaffold dep matrix                                                                          |

---

## Snapshot (2026-05-10, historical — see 2026-07-12 session above for current)

```
Tests:           110/110  (96 unit, 14 browser-chromium)
Suite runtime:   ~5 seconds
First-paint:     93 KB gzipped (was 284 KB before lazy-load)
Editor chunk:    191 KB gzipped (lazy, only on Edit click)
Boards chunk:    3 KB gzipped (lazy, only on Boards click)
TypeScript:      strict, 0 errors
Build:           clean
```

### Coverage matrix

| Surface                                            | Unit (jsdom) | Browser (chromium) |
| -------------------------------------------------- | ------------ | ------------------ |
| Physics math (drive, rotate, arc, sensors)         | ✅           | —                  |
| Step schema validation                             | ✅           | —                  |
| Codegen / persistence                              | ✅           | —                  |
| Store CRUD + caps                                  | ✅           | —                  |
| App DOM (header, mode tabs, press buttons)         | ✅           | ✅                 |
| Canvas pixels at marker / robot positions          | —            | ✅ Phase 2         |
| Canvas stall tint                                  | —            | ✅ Phase 2         |
| Blockly real mount (no freeze)                     | —            | ✅ Phase 1         |
| Hebrew RTL `<html dir>` flip + content translation | —            | ✅ Phase 2         |
| Boards lifecycle + replay                          | —            | ✅ Phase 2         |
| Visual regression baselines                        | —            | parked (Phase 3)   |
| Hebrew aesthetics, animation feel, font rendering  | —            | — _stays HITL_     |

---

## Open HITL items

### Blocking further informed work — 8 questions for the teacher

From `docs/research/competition-format.md`:

| #   | Question                                                                                         | Hebrew                   | Priority |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------ | -------- |
| 1   | What scoring rule wins? Pure time? Time + collisions?                                            | —                        | HIGH     |
| 2   | What blocks were taught? `drive_distance` + `rotate` only, or also `drive_wheels` + `drive_arc`? | "אילו בלוקים למדנו?"     | HIGH     |
| 3   | What's on the cheat-sheet template?                                                              | —                        | MEDIUM   |
| 4   | How big is the physical board? (cm)                                                              | "באיזה גודל לוח התחרות?" | MEDIUM   |
| 5   | What do obstacles look like physically?                                                          | —                        | LOW      |
| 6   | Are sensor-reactive behaviors expected?                                                          | —                        | MEDIUM   |
| 7   | Time limit per attempt?                                                                          | —                        | MEDIUM   |
| 8   | Press-count slots: 2..N skipping 1, confirmed?                                                   | —                        | LOW      |

The parent should ask 1, 2, 4 first — those gate concrete development decisions. The rest are polish.

### Parked features (no decision needed)

- **Phase 3 of Playwright plan** — visual regression baselines (~4h). Trigger: an actual visual regression sneaks past the 110 existing tests.
- **Calibration panel** — only meaningful with a real S3 to measure against.
- **Custom Blockly block labels in Hebrew** — already shipped (771d406), but limited to the kid pressing the language toggle BEFORE entering editor mode (Blockly remounts on language change but only when re-entering editor).
- **Real BlocklyProp `.svg` import** — stretch, deferred.
- **Pen-down drawing mode** — stretch, deferred.

---

## How to pick up next session

The natural triggers for resuming work:

1. **Teacher answers Q2** — if they confirm `drive_wheels` + `drive_arc` are in the kid's class curriculum, those blocks are already shipped. If they're NOT, consider hiding them from the toolbox to reduce kid confusion.
2. **Teacher answers Q1** — if scoring includes collision penalties, the simulator should make collisions more punitive (e.g. count collisions in the run record + display in cheat-sheet).
3. **A visual regression appears** — trigger to ship Phase 3 visual baselines.
4. **The kid uses the simulator and reports something confusing** — direct UX feedback, fastest path to value.

If none of those happen, the simulator is **competition-ready as-is**.

---

## Operating notes for future Claude sessions

### Bug pattern to watch for

The "Edit behaviors freeze" (`9b1e608`) was a class of bug: a `useEffect` that subscribes to a Zustand store via the selector pattern (`useStore((s) => ...)`) AND writes back to that same key inside the effect. Each write triggers re-subscription notification → effect re-run → another write → infinite loop. **Locked in by `tests/browser/smoke.spec.tsx::editor-tab-shows-blockly-workspace`.** If this test ever flakes, suspect the same pattern.

### Test bridge

`window.__scribbler` is gated by `import.meta.env.MODE === 'test'` in `src/main.tsx`. Tree-shaken in production. Do NOT remove the gate or expose stores unconditionally.

### Convention pin

**Positive degrees = clockwise on screen = right turn.** This is the screen-coordinate convention (canvas `+y` is down). Documented in `src/sim/types.ts` and locked in by 2 tests in `runtime.test.ts`.

### Calibration pin (2026-07-12)

`WHEEL_BASE_M = 0.153`, `TICKS_PER_M = 2019` — sourced from Parallax's own S3 driver (`scribbler.spin`: `DEFAULT_WHEEL_SPACE = 153`, ~0.5 mm/encoder count). Do not "fix" these back to the old 0.105/340; those were wrong (drive_wheels steering ran ~46% fast). The line-follower starter gains in `starter.ts` were tuned against 0.153 and are pinned by `grade79-follower.validation.test.ts`.

### Dependency quirk

Browser-test deps (`@vitest/browser`, `vitest-browser-react`) require `--legacy-peer-deps` to coexist with `vitest@^3.2.4`. If you bump vitest to v4, drop the legacy flag and pin browser deps to matching v4.
