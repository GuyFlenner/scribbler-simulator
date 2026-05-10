# Scribbler Simulator — SDLC Status

**Last updated**: 2026-05-10
**Current phase**: Items 1 & 2 shipped → Item 3 (sensor sim) is next
**Active backlog item**: Item 3 — Sensor simulation + reactive blocks (P1, M)

---

## Pipeline progress

### Item 1 — MVP simulator core (commit `53f0a8a`)
- 4–7 inline: 19/19 tests, typecheck, build green
- See `git log` for details

### Item 2 — Block editor for behavior definition (this commit)
| Phase | Skill | Status |
|-------|-------|--------|
| 0 | Branch | stayed on main per CLAUDE.md |
| 0.5 | Tier 3 + TDD active | ✅ |
| 1–3 | PO/TL/Arch | reused Item 2 entry from existing backlog + design doc |
| 4 | Developer — TDD | ✅ 22 new tests written first → green; 3 App integration tests added |
| 4.5 | Test Reviewer (inline) | ✅ PASS — 5 schema-validation security tests included |
| 5 | Security Researcher (inline) | ✅ APPROVED — localStorage round-trip is schema-validated, eval_js rejected |
| 6 | Code Reviewer (inline) | ✅ PROCEED — minor cleanup (removed unused label param) |
| 7 | Tests | ✅ 44/44 (was 19, +25 new) |
| 8 | Commit to main | ✅ this commit |

---

## Item 2 — what was shipped

**Files added** (8):
```
src/editor/persistence.ts          ← localStorage save/load + strict validateProgram
src/editor/persistence.test.ts     ← 11 tests (incl. 5 security)
src/editor/codegen.ts              ← Blockly JSON workspace → Step[] compiler
src/editor/codegen.test.ts         ← 11 tests
src/editor/toolbox.ts              ← Block definitions (drive, rotate, stop, beep, wait, repeat)
src/editor/BlocklyEditor.tsx       ← Blockly workspace React wrapper
src/store/editor-store.ts          ← Zustand store, programs[pressCount] → Step[]
src/components/PressCountTabs.tsx  ← 2× through 8× tab strip
src/components/EditorView.tsx      ← Editor screen w/ tabs + Blockly + reset-all-with-confirm
```

**Files modified** (3):
```
src/App.tsx                        ← Mode toggle (simulator / editor)
src/components/PressButtons.tsx    ← 7 buttons (2-8), user-program-first lookup, friendly empty message
src/store/sim-store.ts             ← pressButton(n, steps?) accepts custom steps
src/App.test.tsx                   ← +3 integration tests (user override, empty msg, mode toggle)
```

**Acceptance criteria** (Item 2, all 8 met):
- ✅ Edit-behaviors mode renders Blockly workspace + tabs for press 2× through 8×
- ✅ Toolbox has drive_distance / rotate_degrees / stop / beep / wait / repeat
- ✅ Defined behavior overrides hardcoded fallback (verified by test)
- ✅ Persistence via `scribbler-sim:programs:v1` localStorage key (versioned for future migrations)
- ✅ Empty/malformed user program shows friendly inline message instead of crashing
- ✅ Reset-all asks for confirmation (window.confirm)
- ✅ All existing tests pass (19 → 44)
- ✅ No new security warnings — schema validation enforced on load

---

## Known limitations / follow-ups

- **Bundle size**: editor adds Blockly (~180 KB gzipped). Simulator-only flow could lazy-load `EditorView` via `React.lazy` to keep first-paint at ~64 KB gzipped. Filed for follow-up; not blocking the kid's practice.
- **Blockly in jsdom**: real workspace mounting is exercised by the mode-toggle test only. Block-drag-and-drop interactions are not unit-testable in jsdom; the codegen logic that they would feed is fully tested via plain JSON fixtures.
- **Blocklys Hebrew pack**: not yet wired (Item 4 will).
- **Workspace persistence per press-count**: workspaceJson is held in memory per session; on reload, programs reconstruct from Step[] (lossy for layout). Acceptable — the kid cares about behavior, not block positions. If this annoys him, we serialize layout in `scribbler-sim:programs:v1` next iteration.

---

## Next action

```
use sdlc: implement Item 3 — sensor simulation + reactive blocks
```

---

## HITL items still open

- Kid's exact class block vocabulary unverified (using BlocklyProp Solo standard per project-owner directive 2026-05-10). Re-validate Item 3 toolbox if teacher's reference sheet becomes available.
- 4-week timeline — Item 5 (P2) remains the natural cut.
