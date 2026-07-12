import type { BoardState } from './schema';

/**
 * Grade-5 practice board — models the real grade-5 Robotraffic mats: green
 * forbidden corner triangles with red dashed hypotenuses and a diagonal
 * dashed wall across the middle, so the direct A→B diagonal is blocked and
 * the kid must combine 45° turns with cardinal legs.
 *
 * Solvability is locked by grade5-diagonal.validation.test.ts, which drives
 * this exact sequence through the full sim pipeline:
 *   rotate 45 → drive 21 → rotate -45 → drive 60 → rotate 90 → drive 60
 *   → rotate -45 → drive 21  ⇒ reached-goal
 * (Clearances: the eastward leg passes 10cm below the wall's near end; the
 * southward leg passes 10cm right of it.)
 */
export const diagonalBoard: BoardState = {
  version: 1,
  id: 'diagonal',
  name: 'Diagonal ↗ (1.0m × 1.0m)',
  width: 1.0,
  height: 1.0,
  elements: [
    { kind: 'start', x: 0.05, y: 0.05, heading: 0 },
    { kind: 'goal', x: 0.95, y: 0.95, toleranceCm: 5 },
    { kind: 'corner', corner: 'ne', size: 0.2 },
    { kind: 'corner', corner: 'sw', size: 0.2 },
    { kind: 'wall', x1: 0.3, y1: 0.7, x2: 0.7, y2: 0.3, thickness: 0.02, style: 'dashed' },
    { kind: 'obstacle', x: 0.2, y: 0.4, w: 0.1, h: 0.1 },
    { kind: 'obstacle', x: 0.55, y: 0.65, w: 0.1, h: 0.1 },
  ],
};
