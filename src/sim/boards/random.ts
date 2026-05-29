import type { BoardState, Obstacle } from './schema';

/**
 * Random board generator.
 *
 * Produces a board with the same fixed start/goal and full-cell obstacle idiom
 * as the bundled maze board, but with a randomized obstacle layout that is
 * *guaranteed* solvable from A (start cell) to B (goal cell). Pure — no React,
 * no zustand, no localStorage — so it is trivially unit-testable with an
 * injectable RNG.
 *
 * Same movement rules as every other board: obstacles are full 10cm grid
 * squares snapped to the grid, start = cell (0,0), goal = cell (size-1,size-1).
 */

/** Stable id for the single transient random board (regenerated in place). */
export const RANDOM_BOARD_ID = 'random';
/** Default grid is 10×10 cells (matches the 1.0m board at 10cm/cell). */
export const GRID_SIZE = 10;
/** One cell = 10cm. */
export const CELL_M = 0.1;

/** Random source in [0,1). Defaults to Math.random; inject for deterministic tests. */
export type Rng = () => number;

export interface RandomBoardOptions {
  /** Random source in [0,1). Defaults to Math.random. */
  rng?: Rng;
  /** Grid dimension (cells per side). Defaults to GRID_SIZE (10). */
  size?: number;
  /** Desired obstacle count. Defaults to a random value in [12,24]. */
  obstacleCount?: number;
}

/** Min/max obstacles when no explicit count is given — a sparse, always-navigable maze. */
const DEFAULT_MIN_OBSTACLES = 12;
const DEFAULT_MAX_OBSTACLES = 24;
/** How many random layouts to try at a given count before reducing density. */
const ATTEMPTS_PER_COUNT = 40;

const cellKey = (col: number, row: number): string => `${col},${row}`;

/**
 * 4-connected BFS from cell (0,0) to (size-1,size-1) over an occupancy grid.
 * `blocked[row][col] === true` means the cell is impassable. Returns true iff
 * the goal cell is reachable (and neither start nor goal is itself blocked).
 */
export function isGridSolvable(blocked: boolean[][], size = GRID_SIZE): boolean {
  if (size <= 0) return false;
  if (blocked[0]?.[0] || blocked[size - 1]?.[size - 1]) return false;

  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );
  const queue: Array<[number, number]> = [[0, 0]];
  visited[0][0] = true;

  while (queue.length > 0) {
    const [row, col] = queue.shift()!;
    if (row === size - 1 && col === size - 1) return true;
    const neighbours: Array<[number, number]> = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];
    for (const [r, c] of neighbours) {
      if (r < 0 || r >= size || c < 0 || c >= size) continue;
      if (blocked[r][c] || visited[r][c]) continue;
      visited[r][c] = true;
      queue.push([r, c]);
    }
  }
  return false;
}

/** Build an occupancy grid from a board's obstacle elements. */
export function boardOccupancy(board: BoardState, size = GRID_SIZE): boolean[][] {
  const blocked: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );
  for (const el of board.elements) {
    if (el.kind !== 'obstacle') continue;
    const col = Math.round(el.x * 10);
    const row = Math.round(el.y * 10);
    if (col >= 0 && col < size && row >= 0 && row < size) blocked[row][col] = true;
  }
  return blocked;
}

/** True iff the board is BFS-solvable from start cell to goal cell. */
export function isBoardSolvable(board: BoardState, size = GRID_SIZE): boolean {
  return isGridSolvable(boardOccupancy(board, size), size);
}

const randomInt = (rng: Rng, minInclusive: number, maxInclusive: number): number =>
  minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1));

/**
 * Pick `count` distinct cells from `candidates` using a partial Fisher-Yates
 * shuffle driven by `rng`. Returns the first `count` shuffled candidates.
 */
const pickCells = (
  rng: Rng,
  candidates: Array<[number, number]>,
  count: number,
): Array<[number, number]> => {
  const pool = candidates.slice();
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, n);
};

/** Centre coordinate (metres) of cell index `i`, computed with integer math to avoid float drift. */
const cellCentre = (i: number): number => (i * 10 + 5) / 100;

const buildBoard = (
  obstacleCells: Array<[number, number]>,
  size: number,
): BoardState => {
  const goalCoord = cellCentre(size - 1);
  const obstacles: Obstacle[] = obstacleCells.map(([col, row]) => ({
    kind: 'obstacle' as const,
    x: col * CELL_M,
    y: row * CELL_M,
    w: CELL_M,
    h: CELL_M,
  }));
  return {
    version: 1,
    id: RANDOM_BOARD_ID,
    name: 'Random board 🎲',
    width: 1.0,
    height: 1.0,
    elements: [
      { kind: 'start', x: 0.05, y: 0.05, heading: 0 },
      { kind: 'goal', x: goalCoord, y: goalCoord, toleranceCm: 5 },
      ...obstacles,
    ],
  };
};

/**
 * Generate a random, always-solvable board.
 *
 * Strategy: rejection sampling. Pick `obstacleCount` random cells (never the
 * start or goal cell), build the board, and accept it only if BFS-solvable.
 * If repeated attempts at a given count all fail, reduce the count by 2 and try
 * again, down to 0 obstacles (which is trivially solvable). This guarantees the
 * function always returns a solvable board — AC3.
 */
export function generateRandomBoard(options: RandomBoardOptions = {}): BoardState {
  const rng = options.rng ?? Math.random;
  const size = options.size ?? GRID_SIZE;

  // All cells except the start (0,0) and goal (size-1,size-1) are candidates.
  const candidates: Array<[number, number]> = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (cellKey(col, row) === cellKey(0, 0)) continue;
      if (cellKey(col, row) === cellKey(size - 1, size - 1)) continue;
      candidates.push([col, row]);
    }
  }

  const desired =
    options.obstacleCount ?? randomInt(rng, DEFAULT_MIN_OBSTACLES, DEFAULT_MAX_OBSTACLES);

  for (let count = Math.min(desired, candidates.length); count >= 0; count -= 2) {
    const attempts = count === 0 ? 1 : ATTEMPTS_PER_COUNT;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const cells = pickCells(rng, candidates, count);
      const board = buildBoard(cells, size);
      if (isBoardSolvable(board, size)) return board;
    }
  }

  // Unreachable in practice — count === 0 is always solvable — but keep the
  // type-checker happy and provide a final safe fallback.
  return buildBoard([], size);
}
