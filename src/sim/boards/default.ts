import type { BoardState } from './schema';

/**
 * The "plain" default board — A, B, two obstacles. Active on first load
 * for backwards-compat (id stays `default` so existing localStorage keeps
 * working). Use this for practice runs that focus purely on routing.
 */
export const defaultBoard: BoardState = {
  version: 1,
  id: 'default',
  name: 'Default 1m × 1m board',
  width: 1.0,
  height: 1.0,
  elements: [
    { kind: 'start', x: 0.05, y: 0.05, heading: 0 },
    { kind: 'goal', x: 0.92, y: 0.92, toleranceCm: 5 },
    { kind: 'obstacle', x: 0.3, y: 0.2, w: 0.08, h: 0.06 },
    { kind: 'obstacle', x: 0.6, y: 0.65, w: 0.08, h: 0.08 },
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
  name: 'Default board + bonus ⭐',
  width: 1.0,
  height: 1.0,
  elements: [
    { kind: 'start', x: 0.05, y: 0.05, heading: 0 },
    { kind: 'goal', x: 0.92, y: 0.92, toleranceCm: 5 },
    { kind: 'obstacle', x: 0.3, y: 0.2, w: 0.08, h: 0.06 },
    { kind: 'obstacle', x: 0.6, y: 0.65, w: 0.08, h: 0.08 },
    { kind: 'bonus', x: 0.45, y: 0.5, toleranceCm: 8 },
  ],
};

export const bundledBoards: BoardState[] = [defaultBoard, bonusBoard];

export const isBundledBoardId = (id: string): boolean =>
  bundledBoards.some((b) => b.id === id);

export const findBundledBoard = (id: string): BoardState | undefined =>
  bundledBoards.find((b) => b.id === id);
