# Scribbler Simulator — SDLC Status

**Last updated**: 2026-05-10
**Current phase**: Phase 4–7 complete for Item 1 → ready for Phase 4 (Item 2)
**Active backlog item**: Item 2 — Block editor (P1, L) — next

---

## Pipeline progress

| Phase | Skill | Status |
|-------|-------|--------|
| 0 | Scaffold + skill sync | ✅ Done (commit `eb7b417`) |
| 1 | Product Owner — backlog | ✅ Done (commit `8fd2bfd`) — 5 items, 29 ACs |
| 2 | Team Lead | ⏭ Skipped (single-dispatcher mode) |
| 3 | Architect — design + ADR + diagram | ✅ Done (commit `8fd2bfd`) |
| 3.5 | Scaffold sanity-check | ✅ Done (commit `28769b6`) |
| 4 | Developer — Item 1 (TDD) | ✅ Done — 19/19 tests, typecheck, build |
| 4.5 | Test Reviewer (inline) | ✅ PASS — no vacuous tests |
| 5 | Security Researcher (inline) | ✅ APPROVED — no network/eval/secrets |
| 6 | Code Reviewer (inline) | ✅ PROCEED — TICKS_PER_M centralized |
| 7 | Tests | ✅ exit=0, 19/19 |
| 8 | Commit to main (PR step suspended) | ✅ this commit |
| 9 | Flow Reviewer | deferred (low value for greenfield + single op) |

---

## Item 1 — what was shipped

**Files added** (16):

```
src/sim/types.ts                       ← RobotState, SimState, robot dimensions
src/sim/physics.ts                     ← tick, detectCollision, makeRobotState
src/sim/runtime.ts                     ← Step[] executor with encoder-based completion
src/sim/physics.test.ts                ← 8 tests
src/sim/behaviors/schema.ts            ← Step, Behavior, Program types
src/sim/behaviors/hardcoded.ts         ← 4 default behaviors (press 2..5)
src/sim/boards/schema.ts               ← BoardElement union + parseBoard validator
src/sim/boards/schema.test.ts          ← 5 tests (security)
src/sim/boards/default.ts              ← 1m × 1m default board
src/store/sim-store.ts                 ← Zustand sim-store (pressButton, tick, resetBoard)
src/components/BoardCanvas.tsx         ← Canvas2D rendering at rAF
src/components/PressButtons.tsx        ← Press 2-5 + Reset board buttons
src/components/SimulatorView.tsx       ← Layout + success overlay + stall indicator
src/App.tsx                            ← Updated to mount SimulatorView
src/App.test.tsx                       ← Replaced scaffold test with 6 integration tests
src/test-setup.ts                      ← Stubbed HTMLCanvasElement.getContext for jsdom
```

**Dependencies added**: `zustand@^5.0.2`

**Acceptance criteria** (Item 1, all 8 met):
- ✅ 1m × 1m board renders with robot at A and labelled B
- ✅ Robot proportions ~19cm × 16cm; front edge marked (white stripe)
- ✅ 4 hardcoded behaviors bound to press 2× through 5×
- ✅ Collision detection halts robot, sets isStalled, shows indicator
- ✅ Goal detection triggers "Well done" overlay with elapsed time
- ✅ Reset board returns robot to start marker
- ✅ All tests pass (19 new, 0 existing → 19/19)
- ✅ No security warnings (no network, no eval, no innerHTML)

---

## Known limitations / follow-ups

- Robot bounding box is axis-aligned (not heading-rotated) — acceptable for MVP per design doc; tighten in calibration phase.
- rAF loop in BoardCanvas is not directly tested (jsdom doesn't run rAF deterministically); the physics tick it drives is fully covered.
- `npm run dev` smoke-test in a browser is recommended before declaring the simulator usable for the kid — code-level gates pass, but visual fidelity needs a human eye.

---

## Next action

```
use sdlc: implement Item 2 — block editor for behavior definition. Backlog at docs/backlog/initial-backlog.md item 2, design at docs/design/simulator-architecture.md (editor section). Commit to main directly.
```

---

## HITL items still open

- Kid's exact class block vocabulary unverified (using BlocklyProp Solo standard per project-owner directive 2026-05-10). Re-validate Item 2 toolbox if teacher's reference sheet becomes available.
- 4-week timeline — Item 5 (P2) remains the natural cut.
