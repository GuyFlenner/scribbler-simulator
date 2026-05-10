# Scribbler Simulator — SDLC Status

**Last updated**: 2026-05-10
**Current phase**: Items 1, 2, 3, 4 shipped → competition-ready MVP. Item 5 (P2) optional.
**Active backlog item**: Item 5 — Practice features (P2, M) — optional / stretch

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

### Item 3 — Sensor simulation + reactive blocks (this commit)
| Phase | Status |
|-------|--------|
| 4 (TDD) | 24 tests written first → green; runtime rewritten to generator-based interpreter |
| 4.5 Test review | PASS — sensor reads against fixture boards, predicate eval, while/if/repeat semantics |
| 5 Security | APPROVED — pure functions, no new external surface |
| 6 Code review | PROCEED — generator runtime is simpler than prior state-machine; removed unused import |
| 7 Tests | exit=0, 68/68 (was 44 → +24) |
| 8 Commit | this commit |

**Files added** (2): `src/sim/sensors.ts` (+ test), `src/sim/runtime.test.ts`
**Files modified** (4): `src/sim/runtime.ts` (rewritten with generators), `src/store/sim-store.ts` (passes board), `src/editor/codegen.ts` (+ if_sensor / while_sensor / while_not_sensor), `src/editor/toolbox.ts` (+ sensor blocks, message2/args2)

Acceptance criteria (Item 3, all 7 met):
- ✅ line_sensor_left/right react to painted-line elements with correct lateral offsets
- ✅ obstacle_left/right detect obstacles within 15cm and ±30° front cone
- ✅ light_sensor returns 0..255 inverse-square in 90° front cone
- ✅ Toolbox includes sensor blocks combinable with if/while/repeat-until
- ✅ Reactive program "while NOT line_left drive 1cm" stops on line crossing (verified by runtime test)
- ✅ All existing tests pass (44 → 68)
- ✅ No new security findings

---

### Item 4 — Bilingual UI (this commit)
| Phase | Status |
|-------|--------|
| 4 (TDD) | 5 new tests written first → green |
| 4.5 Test review | PASS — i18n key parity, empty-leaf scan, hardcoded-string scanner, language-toggle integration |
| 5 Security | APPROVED — versioned localStorage key, React JSX escape preserves XSS protection through t() |
| 6 Code review | PROCEED — automated hardcoded-string scanner enforces "no literal UI text" rule per AC#6 |
| 7 Tests | exit=0, 73/73 (was 68) |
| 8 Commit | this commit |

**Files added** (8): `src/i18n/{en,he}.json`, `src/i18n/index.ts`, `src/i18n/deep-keys.ts`, `src/i18n/keys.test.ts`, `src/i18n/hardcoded-strings.test.ts`, `src/components/LanguageToggle.tsx`
**Files modified** (8): App, BoardCanvas, EditorView, PressButtons, PressCountTabs, SimulatorView all use `t()`. main.tsx imports `./i18n`. test-setup.ts forces `en` deterministically. BlocklyEditor wires `blockly/msg/he` and the `rtl` flag.

Acceptance criteria (Item 4, all 7 met):
- ✅ Top-right toggle switches all UI strings between EN/HE without page reload
- ✅ Hebrew → `dir=rtl` on `<html>`; LTR-embedded numerals via `‎` markers in keys
- ✅ `i18next-browser-languagedetector` reads `navigator.language`; defaults to Hebrew if browser locale is `he*`
- ✅ Selection persists in `scribbler-sim:lang:v1` localStorage key, restored on reload
- ✅ Blockly built-in messages load `msg/he` and `rtl: true` injection when Hebrew active
- ✅ Hardcoded-string scanner test fails any future PR that ships a literal `>text<` in `src/components/*.tsx`
- ✅ All existing tests pass (68 → 73)
- ✅ No new security warnings — scanner test catches regressions

---

## Known limitations / follow-ups

- **Custom Blockly block labels** (drive_distance, rotate_degrees, etc.) remain in English — only Blockly's built-in messages use `msg/he`. Translating custom block labels is post-MVP (would need Blockly's `Blockly.Msg` per-locale registration).
- **Blockly language change requires re-mount**: switching language while inside the editor doesn't re-localise the open workspace — leaving and re-entering editor mode picks up the new language. Acceptable for an 8-year-old user; document.
- **Bundle size** crossed 1 MB (279 KB gzipped). Lazy-loading the editor + i18n resources is the natural fix; filed as follow-up.

---

## Next action

The MVP is competition-ready. Item 5 is **optional** (P2):

```
use sdlc: implement Item 5 — practice features (board editor, multiple boards, time tracking)
```

Or focus on hardening: lazy-load editor for faster first paint, calibration panel, replay export, etc.

---

## HITL items still open

- Kid's exact class block vocabulary unverified (using BlocklyProp Solo standard per project-owner directive 2026-05-10). Re-validate Item 3 toolbox if teacher's reference sheet becomes available.
- 4-week timeline — Item 5 (P2) remains the natural cut.
