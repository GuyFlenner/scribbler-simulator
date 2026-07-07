---
name: Board layout — 1.0m × 1.0m with 10cm grid
description: Board is 1.0m × 1.0m with 10 cells × 10cm each. Competition buttons now 10/20/40cm. Obstacles/start/goal re-snapped.
type: project
---
Board is **1.0m × 1.0m** with 10 cells × 10cm each. This aligns competition button distances exactly:
- btn1 (10cm) = exactly 1 square forward
- btn2 (20cm) = exactly 2 squares forward
- btn3 (40cm) = exactly 4 squares forward

Element positions (defaultBoard / bonusBoard):
- Start: (0.05, 0.05) — centre of cell (0,0)
- Goal: (0.95, 0.95) — centre of cell (9,9), toleranceCm=5
- Obstacle 1: x=0.30, y=0.20, w=0.10, h=0.10 — full grid square at cells (3,2)
- Obstacle 2: x=0.60, y=0.60, w=0.10, h=0.10 — full grid square at cells (6,6)
- Bonus zone (bonusBoard only): centre (0.45, 0.55), toleranceCm=8

**Why:** User requested simpler 10cm/cell grid (was 12cm from a prior session's alignment fix). The new grid is round numbers that are easier to reason about.

**How to apply:** Grid boundaries are at multiples of 0.10m. When placing new elements, snap x/y to 0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00. Cell centres are at 0.05, 0.15, 0.25, ... 0.95.
