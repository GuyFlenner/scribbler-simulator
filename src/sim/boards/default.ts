import type { BoardState } from './schema';

/**
 * The "plain" default board — A, B, two obstacles. Active on first load
 * for backwards-compat (id stays `default` so existing localStorage keeps
 * working). Use this for practice runs that focus purely on routing.
 *
 * Board is 1.0m × 1.0m with a 10-cell grid → each cell = 10cm.
 * btn1=10cm=1 cell, btn2=20cm=2 cells, btn3=40cm=4 cells.
 * Obstacles are full grid squares (10cm × 10cm) so they read as whole-cell blockers.
 */
export const defaultBoard: BoardState = {
  version: 1,
  id: 'default',
  name: 'Default board (1.0m × 1.0m)',
  width: 1.0,
  height: 1.0,
  elements: [
    { kind: 'start', x: 0.05, y: 0.05, heading: 0 },
    { kind: 'goal', x: 0.95, y: 0.95, toleranceCm: 5 },
    { kind: 'obstacle', x: 0.30, y: 0.20, w: 0.10, h: 0.10 },
    { kind: 'obstacle', x: 0.60, y: 0.60, w: 0.10, h: 0.10 },
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
  name: 'Default board + bonus ⭐ (1.0m × 1.0m)',
  width: 1.0,
  height: 1.0,
  elements: [
    { kind: 'start', x: 0.05, y: 0.05, heading: 0 },
    { kind: 'goal', x: 0.95, y: 0.95, toleranceCm: 5 },
    { kind: 'obstacle', x: 0.30, y: 0.20, w: 0.10, h: 0.10 },
    { kind: 'obstacle', x: 0.60, y: 0.60, w: 0.10, h: 0.10 },
    { kind: 'bonus', x: 0.45, y: 0.55, toleranceCm: 8 },
  ],
};

export const bundledBoards: BoardState[] = [defaultBoard, bonusBoard];

export const isBundledBoardId = (id: string): boolean =>
  bundledBoards.some((b) => b.id === id);

export const findBundledBoard = (id: string): BoardState | undefined =>
  bundledBoards.find((b) => b.id === id);
