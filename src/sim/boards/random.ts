import type { BoardState, Obstacle } from './schema';

/**
 * Random *maze* generator.
 *
 * Produces a board with the same fixed start/goal and full-cell obstacle idiom
 * as the bundled maze board, but with a freshly randomized maze on every call —
 * walls form corridors and dead-end pockets (not a scatter of disconnected
 * blocks), and the layout is *guaranteed* solvable from A (start cell) to B
 * (goal cell). Pure — no React, no zustand, no localStorage — so it is trivially
 * unit-testable with an injectable RNG.
 *
 * The maze is carved by recursive division: start from a fully open grid and
 * recursively bisect each chamber with a wall line that has a single passage
 * gap. Because every division leaves exactly one gap, the open cells stay
 * connected — so start↔goal is reachable by construction, with the four grid
 * corners (start and goal included) never walled.
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
}

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

/** True iff an even integer exists in [lo, hi]. */
const evenExists = (lo: number, hi: number): boolean =>
  (lo % 2 === 0 ? lo : lo + 1) <= (hi % 2 === 0 ? hi : hi - 1);
/** True iff an odd integer exists in [lo, hi]. */
const oddExists = (lo: number, hi: number): boolean =>
  (lo % 2 === 1 ? lo : lo + 1) <= (hi % 2 === 1 ? hi : hi - 1);
/** Random even integer in [lo, hi] (caller must ensure one exists). */
const randEven = (rng: Rng, lo: number, hi: number): number => {
  const s = lo % 2 === 0 ? lo : lo + 1;
  const e = hi % 2 === 0 ? hi : hi - 1;
  return s + 2 * Math.floor(rng() * ((e - s) / 2 + 1));
};
/** Random odd integer in [lo, hi] (caller must ensure one exists). */
const randOdd = (rng: Rng, lo: number, hi: number): number => {
  const s = lo % 2 === 1 ? lo : lo + 1;
  const e = hi % 2 === 1 ? hi : hi - 1;
  return s + 2 * Math.floor(rng() * ((e - s) / 2 + 1));
};

/**
 * Carve a maze into a fresh occupancy grid via *parity* recursive division.
 *
 * Every cell starts open. Each chamber bounded by cols [x1..x2] × rows [y1..y2]
 * (inclusive) is bisected by a wall, with one cell left open as a passage; we
 * then recurse into the two halves.
 *
 * The key invariant — and the reason the maze is always connected — is parity:
 * walls only ever land on EVEN grid lines, and passage gaps only on ODD cells.
 * A later perpendicular wall (even line) therefore can never overwrite an
 * earlier wall's passage (odd cell), so no division ever seals off the gap that
 * keeps two chambers connected. (A naive recursive division without this rule
 * disconnects ~⅔ of the time, which then forces an ugly L-shaped fallback.)
 *
 * Consequences: walls live on interior even lines only, so the four corners —
 * start (0,0) and, on the even-sided default grid, goal (size-1,size-1) on odd
 * lines — are never walled, and every open cell stays reachable. Solvable by
 * construction.
 */
export const carveMaze = (size: number, rng: Rng): boolean[][] => {
  const blocked: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );

  const divide = (x1: number, y1: number, x2: number, y2: number): void => {
    const w = x2 - x1 + 1;
    const h = y2 - y1 + 1;
    // Horizontal wall: even interior row + odd passage column. Vertical: mirror.
    const canHorizontal = evenExists(y1 + 1, y2 - 1) && oddExists(x1, x2);
    const canVertical = evenExists(x1 + 1, x2 - 1) && oddExists(y1, y2);
    if (!canHorizontal && !canVertical) return; // corridor — too thin to divide

    // Split the longer axis (ties broken randomly) so chambers stay squarish.
    const horizontal =
      canHorizontal && canVertical ? (h > w ? true : w > h ? false : rng() < 0.5) : canHorizontal;

    if (horizontal) {
      const wallRow = randEven(rng, y1 + 1, y2 - 1);
      const passageCol = randOdd(rng, x1, x2);
      for (let c = x1; c <= x2; c++) {
        if (c !== passageCol) blocked[wallRow][c] = true;
      }
      divide(x1, y1, x2, wallRow - 1);
      divide(x1, wallRow + 1, x2, y2);
    } else {
      const wallCol = randEven(rng, x1 + 1, x2 - 1);
      const passageRow = randOdd(rng, y1, y2);
      for (let r = y1; r <= y2; r++) {
        if (r !== passageRow) blocked[r][wallCol] = true;
      }
      divide(x1, y1, wallCol - 1, y2);
      divide(wallCol + 1, y1, x2, y2);
    }
  };

  divide(0, 0, size - 1, size - 1);
  return blocked;
};

/** Centre coordinate (metres) of cell index `i`, computed with integer math to avoid float drift. */
const cellCentre = (i: number): number => (i * 10 + 5) / 100;

const buildBoard = (blocked: boolean[][], size: number): BoardState => {
  const goalCoord = cellCentre(size - 1);
  const startCell = cellKey(0, 0);
  const goalCell = cellKey(size - 1, size - 1);

  const obstacles: Obstacle[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!blocked[row][col]) continue;
      // Never wall the start or goal cell (recursive division already avoids
      // the corners; this is a belt-and-braces guard).
      if (cellKey(col, row) === startCell || cellKey(col, row) === goalCell) continue;
      obstacles.push({
        kind: 'obstacle',
        x: col * CELL_M,
        y: row * CELL_M,
        w: CELL_M,
        h: CELL_M,
      });
    }
  }

  return {
    version: 1,
    id: RANDOM_BOARD_ID,
    name: 'Random maze 🎲',
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
 * Open an L-shaped corridor (top row + right column) through the grid. This
 * path from (0,0) to (size-1,size-1) is always passable, so it is a guaranteed
 * solvable fallback if maze carving ever produced an unsolvable layout.
 */
const carveSafetyPath = (blocked: boolean[][], size: number): void => {
  for (let col = 0; col < size; col++) blocked[0][col] = false;
  for (let row = 0; row < size; row++) blocked[row][size - 1] = false;
};

/**
 * Generate a random, always-solvable maze board.
 *
 * Recursive division guarantees the carved maze is connected, so the result is
 * solvable by construction (AC3). A defensive BFS check + L-path fallback keeps
 * the guarantee absolute even for degenerate grid sizes.
 */
export function generateRandomBoard(options: RandomBoardOptions = {}): BoardState {
  const rng = options.rng ?? Math.random;
  const size = options.size ?? GRID_SIZE;

  const blocked = carveMaze(size, rng);
  if (!isGridSolvable(blocked, size)) carveSafetyPath(blocked, size);

  return buildBoard(blocked, size);
}
