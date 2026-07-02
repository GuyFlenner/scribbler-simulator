---
name: Robot fits in 1 grid square (kid feedback)
description: The kid found the original 19×16cm robot too big and the near-square aspect ratio made 90° turns look diagonal. Robot is now sized + shaped for a 1m×1m board with 10cm grid.
type: feedback
---
The robot's visual must fit within roughly one 10cm grid square on the 1m×1m board, with a clearly elongated aspect ratio (≥1.3:1) so heading direction is readable at every cardinal angle. A near-square robot looks "diagonal" at heading=π/2 even when the math is correct.

**Why:** The kid (8yo) reported that 90° turns looked like 45° turns and forward moves after a turn looked diagonal. Investigation showed the physics was exact — the visual was the problem: 19×16cm robot (1.19:1 aspect) on a 50px-per-grid-cell canvas spanned ~2 cells and was too close to square to read direction.

**How to apply:**
- `ROBOT_LENGTH_M` / `ROBOT_WIDTH_M` in `src/sim/types.ts` are now 0.09 / 0.065 — don't bump them back up without a reason. They are also the collision-bbox dimensions; keeping them small means the kid can squeeze through narrow gaps but that's acceptable for a practice tool.
- `WHEEL_BASE_M = 0.105` is decoupled from the visual — keep it at the real S3's 10.5 cm because it's used in physics (encoder ticks + differential-drive math), not drawing.
- Robot drawing in `src/components/board-draw.ts` uses side wheels + pentagon + full-width yellow nose wedge. The yellow wedge spans the entire triangular front (not just a tiny tip) — this is what makes direction obvious. Don't shrink the nose wedge.
- A floating-point heading snap (round to 10 decimal places) lives in `src/store/sim-store.ts` `tick()` when `done = true`. Prevents drift across many turns.
