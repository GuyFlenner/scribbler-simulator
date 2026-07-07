---
name: project_random_board
description: Random board generator — transient (non-persisted) solvable maze from a 🎲 button. Shipped 2026-05-29; rewritten to recursive-division maze (was obstacle scatter) on 2026-06-02.
metadata: 
  node_type: memory
  type: project
---

Shipped 2026-05-29 (`use sdlc`): a 🎲 "Random board" button in the Boards panel
that generates a fresh randomized full-cell obstacle layout each click, always
solvable A→B. Lives in `src/sim/boards/random.ts` (pure, no React/zustand).

Key design decisions (non-obvious from code alone):
- **Transient, not saved.** The random board uses a stable id `RANDOM_BOARD_ID = 'random'`
  held in a `randomBoard: BoardState | null` slot on boards-store — NOT in `customBoards`,
  NOT in localStorage. Repeated clicks regenerate in place so the saved list never grows.
  `getActiveBoard()` resolves it when `activeBoardId === 'random'`; `loadRandomBoard()` sets
  it without calling `persistBoards` (intentional — random is ephemeral).
- **Generation = PARITY recursive division MAZE** (changed 2026-06-02). The original 2026-05-29
  implementation just *scattered* 12–24 random obstacle cells and used BFS rejection sampling
  to keep a path open — it was solvable but did NOT look/play like a maze (disconnected blocks).
  Per owner feedback, `generateRandomBoard` now carves a real maze via recursive division in
  exported `carveMaze(size, rng)`; `RandomBoardOptions.obstacleCount` was REMOVED (options are
  now `{ rng?, size? }`); board name is `'Random maze 🎲'`.
- **The connectivity bug + parity fix (CRITICAL, same day).** The FIRST recursive-division
  attempt placed walls/gaps at arbitrary positions. That has the classic bug: a child chamber's
  perpendicular wall can land on and SEAL its parent wall's single passage gap → the two halves
  disconnect. Measured **3345/5000 (≈67%) of seeds disconnected**, which tripped the
  `carveSafetyPath` fallback (opens entire top row + right column = an L-shaped "half rectangle"
  open border the robot could trivially skirt — exactly what the owner reported breaking).
  FIX = **parity invariant**: walls only on EVEN grid lines, passage gaps only on ODD cells.
  A perpendicular even-line wall can then never overwrite an odd-cell passage, so connectivity
  is guaranteed by construction (verified 0/5000 disconnected). Helpers `evenExists`/`oddExists`/
  `randEven`/`randOdd` enforce it. Corners stay open; on the 10×10 grid the goal (9,9) sits on
  odd lines (row/col 9) that remain corridors, so it connects naturally.
- **Solvability model = 4-connected BFS** (`isGridSolvable`/`isBoardSolvable`), unchanged and
  still exported. Kept as a defensive post-check: if a carved grid is ever unsolvable
  (degenerate sizes), `carveSafetyPath` opens an L-corridor (top row + right column) — a
  guaranteed passable fallback. In practice recursive division never needs it.
- **Injectable `rng: () => number` seam** (defaults to `Math.random`) so tests are
  deterministic via a seeded mulberry32. Tests assert solvability + open start/goal across
  200 seeded generations, plus maze-structure assertions (wall count 15–80, walls span ≥4 rows).
- **Test-gap lesson (why the L-bug shipped):** the maze tests only asserted `isBoardSolvable`
  (ALWAYS true — the safety net guarantees it) and wall counts (the L-shape passes those too),
  so they never caught the 67% disconnection. The regression test that matters checks
  `isGridSolvable(carveMaze(...))` — connectivity of the carve ITSELF, before the safety net —
  plus an explicit "never the degenerate L-shape" guard. Lesson: when a fallback masks a
  failure, test the thing BEFORE the fallback. Echoes [[project_test_coverage_gap]].

**How to apply:** If asked to tune maze difficulty, adjust the chamber-stop threshold (`< 3`)
or wall-position bias inside `carveMaze` in `random.ts` — there is no longer an obstacle-count
knob. If asked to make random boards savable, you'd add a
"Save this board" action that copies `randomBoard` into `customBoards` with a fresh
`newBoardId()` (don't persist under id 'random'). Run history keys runs under boardId
'random', so different random layouts share one history bucket — acceptable for free practice.

Related: [[project_board_layout]] (1.0m/10cm grid this builds on),
[[cross-button-press-flow-was-test-uncovered-until-2026-05-14]] (store-test discipline).
