import { describe, it, expect } from 'vitest';
import {
  RANDOM_BOARD_ID,
  GRID_SIZE,
  CELL_M,
  isGridSolvable,
  boardOccupancy,
  isBoardSolvable,
  generateRandomBoard,
  carveMaze,
  type Rng,
} from './random';
import { parseBoard } from './schema';

/**
 * Deterministic PRNG (mulberry32) so generation tests are reproducible.
 * Returns a function in [0,1) seeded by `seed`.
 */
const seededRng = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const makeGrid = (rows: string[]): boolean[][] =>
  rows.map((row) => [...row].map((ch) => ch === '#'));

const obstacleCells = (board: ReturnType<typeof generateRandomBoard>): Set<string> => {
  const cells = new Set<string>();
  for (const el of board.elements) {
    if (el.kind !== 'obstacle') continue;
    cells.add(`${Math.round(el.x * 10)},${Math.round(el.y * 10)}`);
  }
  return cells;
};

describe('isGridSolvable — 4-connected BFS', () => {
  it('an empty grid is solvable', () => {
    const grid = makeGrid(['...', '...', '...']);
    expect(isGridSolvable(grid, 3)).toBe(true);
  });

  it('a full wall column separating start from goal is NOT solvable', () => {
    // column 1 fully blocked → no path from (0,0) to (2,2)
    const grid = makeGrid(['.#.', '.#.', '.#.']);
    expect(isGridSolvable(grid, 3)).toBe(false);
  });

  it('a single diagonal gap is solvable (path weaves around walls)', () => {
    const grid = makeGrid(['.#.', '..#', '#..']);
    expect(isGridSolvable(grid, 3)).toBe(true);
  });

  it('returns false when the goal cell itself is blocked', () => {
    const grid = makeGrid(['...', '...', '..#']);
    expect(isGridSolvable(grid, 3)).toBe(false);
  });

  it('returns false when the start cell itself is blocked', () => {
    const grid = makeGrid(['#..', '...', '...']);
    expect(isGridSolvable(grid, 3)).toBe(false);
  });
});

describe('boardOccupancy + isBoardSolvable', () => {
  it('maps full-cell obstacles to the occupancy grid', () => {
    const board = generateRandomBoard({ rng: seededRng(1) });
    const occ = boardOccupancy(board, GRID_SIZE);
    let count = 0;
    for (const row of occ) for (const c of row) if (c) count++;
    // every obstacle maps to exactly one occupied cell
    const obstacles = board.elements.filter((e) => e.kind === 'obstacle').length;
    expect(count).toBe(obstacles);
  });

  it('a generated board is reported solvable', () => {
    const board = generateRandomBoard({ rng: seededRng(42) });
    expect(isBoardSolvable(board)).toBe(true);
  });
});

describe('generateRandomBoard — shape', () => {
  it('has the correct id, version, name, and 1.0m × 1.0m bounds', () => {
    const board = generateRandomBoard({ rng: seededRng(7) });
    expect(board.id).toBe(RANDOM_BOARD_ID);
    expect(board.version).toBe(1);
    expect(board.width).toBe(1.0);
    expect(board.height).toBe(1.0);
    expect(board.name.length).toBeGreaterThan(0);
  });

  it('has start at (0.05,0.05) heading 0 and goal at (0.95,0.95) tol 5', () => {
    const board = generateRandomBoard({ rng: seededRng(7) });
    const start = board.elements.find((e) => e.kind === 'start');
    const goal = board.elements.find((e) => e.kind === 'goal');
    expect(start).toMatchObject({ kind: 'start', x: 0.05, y: 0.05, heading: 0 });
    expect(goal).toMatchObject({ kind: 'goal', x: 0.95, y: 0.95, toleranceCm: 5 });
  });

  it('obstacles are full 10cm cells, snapped to grid, inside bounds', () => {
    const board = generateRandomBoard({ rng: seededRng(123) });
    const obstacles = board.elements.filter((e) => e.kind === 'obstacle');
    expect(obstacles.length).toBeGreaterThan(0);
    for (const o of obstacles) {
      if (o.kind !== 'obstacle') continue;
      expect(o.w).toBe(CELL_M);
      expect(o.h).toBe(CELL_M);
      const col = Math.round(o.x * 10);
      const row = Math.round(o.y * 10);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(GRID_SIZE);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(GRID_SIZE);
      // snapped: x,y are exact multiples of 0.1
      expect(col / 10).toBeCloseTo(o.x, 6);
      expect(row / 10).toBeCloseTo(o.y, 6);
      // never on start (0,0) or goal (9,9)
      expect(`${col},${row}`).not.toBe('0,0');
      expect(`${col},${row}`).not.toBe(`${GRID_SIZE - 1},${GRID_SIZE - 1}`);
    }
  });

  it('produces no duplicate obstacle cells', () => {
    const board = generateRandomBoard({ rng: seededRng(555) });
    const obstacles = board.elements.filter((e) => e.kind === 'obstacle');
    const cells = obstacleCells(board);
    expect(cells.size).toBe(obstacles.length);
  });

  it('round-trips through parseBoard (valid schema)', () => {
    const board = generateRandomBoard({ rng: seededRng(99) });
    expect(() => parseBoard(JSON.stringify(board))).not.toThrow();
    const reparsed = parseBoard(JSON.stringify(board));
    expect(reparsed.elements.length).toBe(board.elements.length);
  });
});

describe('generateRandomBoard — solvability guarantee (AC3)', () => {
  it('is ALWAYS solvable across 200 seeded generations', () => {
    for (let seed = 0; seed < 200; seed++) {
      const board = generateRandomBoard({ rng: seededRng(seed) });
      expect(isBoardSolvable(board), `seed ${seed} produced an unsolvable board`).toBe(true);
    }
  });

  it('is ALWAYS solvable across 100 Math.random generations', () => {
    for (let i = 0; i < 100; i++) {
      const board = generateRandomBoard();
      expect(isBoardSolvable(board)).toBe(true);
    }
  });

  it('keeps the start and goal cells open across 200 seeded generations', () => {
    for (let seed = 0; seed < 200; seed++) {
      const occ = boardOccupancy(generateRandomBoard({ rng: seededRng(seed) }), GRID_SIZE);
      expect(occ[0][0], `seed ${seed} walled the start cell`).toBe(false);
      expect(occ[GRID_SIZE - 1][GRID_SIZE - 1], `seed ${seed} walled the goal cell`).toBe(false);
    }
  });
});

describe('carveMaze — connectivity by construction (no safety net)', () => {
  // Regression: a naive recursive division disconnects ~⅔ of the time because a
  // child wall seals its parent's single passage. That made the generator fall
  // back to an L-shaped open border (top row + right column) — a "half
  // rectangle" the robot could trivially skirt. The carve itself must be
  // solvable, so the safety fallback never fires.
  it('every carved 10×10 maze is solvable WITHOUT the L-path fallback (500 seeds)', () => {
    for (let seed = 0; seed < 500; seed++) {
      const grid = carveMaze(GRID_SIZE, seededRng(seed));
      expect(isGridSolvable(grid, GRID_SIZE), `seed ${seed} carved a disconnected maze`).toBe(true);
    }
  });

  it('never produces the degenerate L-shape (whole top row + whole right column open)', () => {
    for (let seed = 0; seed < 500; seed++) {
      const occ = boardOccupancy(generateRandomBoard({ rng: seededRng(seed) }), GRID_SIZE);
      const topRowAllOpen = occ[0].every((c) => !c);
      const rightColAllOpen = occ.every((row) => !row[GRID_SIZE - 1]);
      expect(
        topRowAllOpen && rightColAllOpen,
        `seed ${seed} fell back to the L-shaped half-rectangle`,
      ).toBe(false);
    }
  });

  it('carves connected mazes across a range of sizes', () => {
    for (const size of [4, 5, 6, 8, 9, 12]) {
      for (let seed = 0; seed < 50; seed++) {
        const grid = carveMaze(size, seededRng(seed));
        expect(isGridSolvable(grid, size), `size ${size} seed ${seed} disconnected`).toBe(true);
      }
    }
  });
});

describe('generateRandomBoard — maze structure', () => {
  it('carves a real maze: many corridor walls, not a sparse scatter', () => {
    // Recursive division fills a 10×10 grid with substantial wall structure.
    // A handful of disconnected blocks (the old behaviour) would never reach
    // this many walls; a fully walled grid would be unsolvable. Assert a band.
    for (let seed = 0; seed < 50; seed++) {
      const board = generateRandomBoard({ rng: seededRng(seed) });
      const walls = board.elements.filter((e) => e.kind === 'obstacle').length;
      expect(walls, `seed ${seed} produced only ${walls} walls`).toBeGreaterThanOrEqual(15);
      expect(walls, `seed ${seed} produced ${walls} walls`).toBeLessThanOrEqual(80);
    }
  });

  it('produces interior walls along several distinct rows (corridor structure)', () => {
    const occ = boardOccupancy(generateRandomBoard({ rng: seededRng(11) }), GRID_SIZE);
    const rowsWithWalls = occ.filter((row) => row.some((c) => c)).length;
    // A maze threads walls through most rows; a 2-block scatter touches ≤ 2.
    expect(rowsWithWalls).toBeGreaterThanOrEqual(4);
  });
});

describe('generateRandomBoard — variety (AC2)', () => {
  it('different seeds produce different obstacle layouts', () => {
    const a = obstacleCells(generateRandomBoard({ rng: seededRng(1) }));
    const b = obstacleCells(generateRandomBoard({ rng: seededRng(2) }));
    // not identical sets
    const sameSize = a.size === b.size;
    const identical = sameSize && [...a].every((c) => b.has(c));
    expect(identical).toBe(false);
  });

  it('respects a custom grid size', () => {
    const board = generateRandomBoard({ rng: seededRng(4), size: 6 });
    const obstacles = board.elements.filter((e) => e.kind === 'obstacle');
    for (const o of obstacles) {
      if (o.kind !== 'obstacle') continue;
      expect(Math.round(o.x * 10)).toBeLessThan(6);
      expect(Math.round(o.y * 10)).toBeLessThan(6);
    }
    const goal = board.elements.find((e) => e.kind === 'goal');
    // goal sits at the far cell centre of a 6×6 grid → (0.55, 0.55)
    expect(goal).toMatchObject({ x: 0.55, y: 0.55 });
  });
});
