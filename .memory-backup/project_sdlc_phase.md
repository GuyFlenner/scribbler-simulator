---
name: SDLC phase + session checkpoint (2026-05-11)
description: 121 tests green after QA fixes (board 1.2m, exact rotation, full-square obstacles). Awaiting teacher board diagram.
type: project
---

Session 2026-05-11 shipped: board resized to 1.2m × 1.2m (12cm/cell), rotation precision fixed via corrective velocity + degree snap, obstacles made full 12cm grid squares. 121 tests green.

Original backlog is drained. All 5 items (MVP sim core → block editor → sensor sim → bilingual UI → boards/replay) shipped to `main`. Plus polish: lazy-load (89 KB gzipped first-paint), pentagon robot + emoji markers, drive_wheels/drive_arc primitives, 8-slot cap, printable cheat-sheet, direction-label fix (positive degrees = right turn on screen), and Phases 1+2 of the Vitest-browser-mode test plan (14 browser tests).

**Why:** the parent ran out of features the teacher's competition format actually requires. Further work depends on getting answers to 8 questions filed in `docs/research/competition-format.md`.

**How to apply:**

- Authoritative status doc: `docs/status.md`. Always read it first when resuming.
- Don't redo Phases 1 or 2 of the browser test plan — they shipped at `dd1073f` and `10b3cc9`.
- If the user asks to add new motion blocks, check `src/sim/behaviors/schema.ts` first — `drive_wheels` and `drive_arc` are already there.
- The 8 teacher questions block informed feature work. If the parent hasn't asked yet, suggest they ask Q1 (scoring rule), Q2 (which blocks were taught), Q4 (board size) before any new dev.

**Locked-in invariants** (don't break these):

- Positive `degrees` = clockwise on screen = right turn. See `src/sim/types.ts` comment + 2 tests in `src/sim/runtime.test.ts`. Do NOT switch to math-CCW convention.
- `window.__scribbler` test bridge in `src/main.tsx` is gated by `import.meta.env.MODE === 'test'`. Production tree-shakes it. Do NOT expose stores unconditionally.
- Browser test deps require `--legacy-peer-deps` against vitest@3.2.4.

**Bug pattern locked in by `editor-tab-shows-blockly-workspace` smoke test:** a `useEffect` that both subscribes to a Zustand selector AND writes back to the same key inside the effect → infinite mount loop. The freeze-fix at `9b1e608` documents the pattern.

**Parked features** (don't push these without a trigger):

- Phase 3 visual regression baselines — wait for an actual regression
- Calibration panel — wait for a real S3 robot
- Real BlocklyProp `.svg` import — post-competition stretch
