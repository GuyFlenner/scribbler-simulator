import type { BoardState } from './schema';

/**
 * The "plain" default board — A, B, two obstacles. Active on first load
 * for backwards-compat (id stays `default` so existing localStorage keeps
 * working). Use this for practice runs that focus purely on routing.
 *
 * Board is 1.2m × 1.2m with a 10-cell grid → each cell = 12cm, matching the
 * competition button distances (btn1=12cm=1 cell, btn2=24cm=2 cells, btn3=48cm=4 cells).
 * Obstacles are full grid squares (12cm × 12cm) so they read as whole-cell blockers.
 */
export const defaultBoard: BoardState = {
  version: 1,
  id: 'default',
  name: 'Default board (1.2m × 1.2m)',
  width: 1.2,
  height: 1.2,
  elements: [
    { kind: 'start', x: 0.06, y: 0.06, heading: 0 },
    { kind: 'goal', x: 1.14, y: 1.14, toleranceCm: 5 },
    { kind: 'obstacle', x: 0.36, y: 0.24, w: 0.12, h: 0.12 },
    { kind: 'obstacle', x: 0.72, y: 0.72, w: 0.12, h: 0.12 },
  ],
};

/**
 * Same layout plus a bonus ⭐ near the centre — matches the teacher's
 * description of the actual competition board (A → B with obstacles
 * AND a bonus zone for passing through a specific spot).
 */
export const bonusBoard: BoardState = {
  version: 1,
  id: 'default-bonus',
  name: 'Default board + bonus ⭐ (1.2m × 1.2m)',
  width: 1.2,
  height: 1.2,
  elements: [
    { kind: 'start', x: 0.06, y: 0.06, heading: 0 },
    { kind: 'goal', x: 1.14, y: 1.14, toleranceCm: 5 },
    { kind: 'obstacle', x: 0.36, y: 0.24, w: 0.12, h: 0.12 },
    { kind: 'obstacle', x: 0.72, y: 0.72, w: 0.12, h: 0.12 },
    { kind: 'bonus', x: 0.54, y: 0.60, toleranceCm: 8 },
  ],
};

export const bundledBoards: BoardState[] = [defaultBoard, bonusBoard];

export const isBundledBoardId = (id: string): boolean =>
  bundledBoards.some((b) => b.id === id);

export const findBundledBoard = (id: string): BoardState | undefined =>
  bundledBoards.find((b) => b.id === id);
