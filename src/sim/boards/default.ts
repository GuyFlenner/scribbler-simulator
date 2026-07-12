import type { BoardState, Obstacle } from './schema';
import { diagonalBoard } from './grade5';
import { figureEightBoard, serpentineBoard } from './tracks';

/**
 * The "plain" default board — A, B, two obstacles. Use this for practice
 * runs that focus purely on routing without maze navigation.
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
    { kind: 'obstacle', x: 0.3, y: 0.2, w: 0.1, h: 0.1 },
    { kind: 'obstacle', x: 0.6, y: 0.6, w: 0.1, h: 0.1 },
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
    { kind: 'obstacle', x: 0.3, y: 0.2, w: 0.1, h: 0.1 },
    { kind: 'obstacle', x: 0.6, y: 0.6, w: 0.1, h: 0.1 },
    { kind: 'bonus', x: 0.45, y: 0.55, toleranceCm: 8 },
  ],
};

/**
 * Maze board — same 1.0m × 1.0m / 10cm-cell grid, walls form corridors
 * with dead-end pockets. Robot must navigate from S(0,0) to G(9,9).
 * BFS-verified: shortest path = 24 cells, 3 dead ends. Active on first
 * load — it is the most challenging of the bundled boards and best
 * matches the competition's "navigate around obstacles" goal.
 *
 * Grid layout (S=start, G=goal, #=wall, .=open):
 *
 *     col 0123456789
 *  row 0 S.##.....#
 *  row 1 #.#..###..
 *  row 2 #.#.#.#.#.
 *  row 3 #...#.#.#.
 *  row 4 #.###.#.#.
 *  row 5 #.....#.#.
 *  row 6 #.#####.#.
 *  row 7 #.#.....#.
 *  row 8 #.#.#####.
 *  row 9 #...#....G
 */
const mazeWallCells: Array<[number, number]> = [
  [2, 0],
  [3, 0],
  [9, 0],
  [0, 1],
  [2, 1],
  [5, 1],
  [6, 1],
  [7, 1],
  [0, 2],
  [2, 2],
  [4, 2],
  [6, 2],
  [8, 2],
  [0, 3],
  [4, 3],
  [6, 3],
  [8, 3],
  [0, 4],
  [2, 4],
  [3, 4],
  [4, 4],
  [6, 4],
  [8, 4],
  [0, 5],
  [6, 5],
  [8, 5],
  [0, 6],
  [2, 6],
  [3, 6],
  [4, 6],
  [5, 6],
  [6, 6],
  [8, 6],
  [0, 7],
  [2, 7],
  [8, 7],
  [0, 8],
  [2, 8],
  [4, 8],
  [5, 8],
  [6, 8],
  [7, 8],
  [8, 8],
  [0, 9],
  [4, 9],
];

const mazeWalls: Obstacle[] = mazeWallCells.map(([col, row]) => ({
  kind: 'obstacle' as const,
  x: col * 0.1,
  y: row * 0.1,
  w: 0.1,
  h: 0.1,
}));

export const mazeBoard: BoardState = {
  version: 1,
  id: 'maze',
  name: 'Maze 🌀 (1.0m × 1.0m)',
  width: 1.0,
  height: 1.0,
  elements: [
    { kind: 'start', x: 0.05, y: 0.05, heading: 0 },
    { kind: 'goal', x: 0.95, y: 0.95, toleranceCm: 5 },
    ...mazeWalls,
  ],
};

// Append-only: maze must stay at index 0 (first-load default; asserted in tests).
export const bundledBoards: BoardState[] = [
  mazeBoard,
  defaultBoard,
  bonusBoard,
  diagonalBoard,
  figureEightBoard,
  serpentineBoard,
];

export const isBundledBoardId = (id: string): boolean => bundledBoards.some((b) => b.id === id);

export const findBundledBoard = (id: string): BoardState | undefined =>
  bundledBoards.find((b) => b.id === id);
