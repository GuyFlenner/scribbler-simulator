import type { BoardState } from './schema';

/**
 * Junction drill — the Robotraffic "prescribed turns" exercise: the official
 * rules score executing a demanded turn sequence at intersections. The road
 * grid offers wrong branches at every junction; checkpoint zones (📍, no stop
 * required) sit only on the CORRECT route — right, straight, right — and the
 * finish line only fires once every zone has been visited, so a wrong branch
 * or a cross-country shortcut never scores. A stop sign before the first
 * junction adds the stop discipline.
 *
 * Route (start bottom-left, heading north): stop at 🛑 → junction A: RIGHT →
 * junction B: STRAIGHT → junction C: RIGHT → finish.
 *
 * Solvability is locked by junction-drill.validation.test.ts (a 9-press
 * grade-4-starter solution).
 */
export const junctionDrillBoard: BoardState = {
  version: 1,
  id: 'junction-drill',
  name: 'Junction drill 🚏 (1.0m × 1.0m)',
  width: 1.0,
  height: 1.0,
  elements: [
    { kind: 'start', x: 0.2, y: 0.9, heading: -Math.PI / 2 },
    { kind: 'goal', x: 0.8, y: 0.8, toleranceCm: 5 },
    // Roads (50mm lines). Junctions: A (0.2,0.5), B (0.5,0.5), C (0.8,0.5).
    { kind: 'line', x1: 0.2, y1: 0.9, x2: 0.2, y2: 0.2, thickness: 0.05 },
    { kind: 'line', x1: 0.2, y1: 0.5, x2: 0.8, y2: 0.5, thickness: 0.05 },
    { kind: 'line', x1: 0.5, y1: 0.2, x2: 0.5, y2: 0.8, thickness: 0.05 },
    { kind: 'line', x1: 0.8, y1: 0.2, x2: 0.8, y2: 0.8, thickness: 0.05 },
    { kind: 'line', x1: 0.2, y1: 0.2, x2: 0.8, y2: 0.2, thickness: 0.05 },
    // Stop sign before junction A — full stop for 1s.
    { kind: 'stopzone', x: 0.2, y: 0.58, toleranceCm: 6, requiredStopSeconds: 1, sign: 'stop' },
    // Route checkpoints (pass-through) on the correct branches only.
    {
      kind: 'stopzone',
      x: 0.35,
      y: 0.5,
      toleranceCm: 6,
      requiredStopSeconds: 0,
      sign: 'checkpoint',
    },
    {
      kind: 'stopzone',
      x: 0.65,
      y: 0.5,
      toleranceCm: 6,
      requiredStopSeconds: 0,
      sign: 'checkpoint',
    },
    {
      kind: 'stopzone',
      x: 0.8,
      y: 0.65,
      toleranceCm: 6,
      requiredStopSeconds: 0,
      sign: 'checkpoint',
    },
  ],
};
