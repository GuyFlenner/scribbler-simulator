---
name: Son's confirmed competition button layout
description: The 6 press-count behaviors the kid confirmed for the competition (May 2026) — now updated to 10cm grid
type: project
---
Son confirmed the competition button layout (May 2026 WhatsApp photo of Scribbler Program Maker S3 v2.0):

- Press 1 → forward 10 cm
- Press 2 → forward 20 cm
- Press 3 → forward 40 cm
- Press 4 → turn right 90°
- Press 5 → turn left 90°
- Press 6 → turn 180°

These are now live in `src/sim/behaviors/starter.ts` as `classProgramSample` using `drive` (cm) and `rotate` (degrees) step kinds.

**Why:** The original preset was guessed from a classroom photo. The kid confirmed the actual values, and in May 2026 the board was updated from 12cm/cell to 10cm/cell, so drive distances were updated from 12/24/48 → 10/20/40cm.

**How to apply:** If the kid adjusts any behavior, update `classProgramSample` and the corresponding assertions in `src/App.test.tsx` lines ~211-216. The cheat sheet and Blockly workspace auto-derive from these steps — no other files need changing.
