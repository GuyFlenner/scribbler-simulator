import { describe, it, expect } from 'vitest';
import { mazeBoard, bundledBoards } from './default';

describe('mazeBoard — structure', () => {
  it('is the first bundled board (default selected on fresh load)', () => {
    expect(bundledBoards[0].id).toBe('maze');
  });

  it('has start at (0.05, 0.05) and goal at (0.95, 0.95)', () => {
    const start = mazeBoard.elements.find((e) => e.kind === 'start');
    const goal = mazeBoard.elements.find((e) => e.kind === 'goal');
    expect(start).toMatchObject({ kind: 'start', x: 0.05, y: 0.05 });
    expect(goal).toMatchObject({ kind: 'goal', x: 0.95, y: 0.95 });
  });

  it('walls are full 10cm grid squares snapped to grid', () => {
    const walls = mazeBoard.elements.filter((e) => e.kind === 'obstacle');
    expect(walls.length).toBeGreaterThan(20);
    for (const w of walls) {
      if (w.kind !== 'obstacle') continue;
      expect(w.w).toBe(0.1);
      expect(w.h).toBe(0.1);
      // x,y are integer multiples of 0.10 (within float epsilon)
      expect(Math.round(w.x * 10) / 10).toBeCloseTo(w.x, 6);
      expect(Math.round(w.y * 10) / 10).toBeCloseTo(w.y, 6);
    }
  });

  it('start and goal cells are not blocked by walls', () => {
    const walls = mazeBoard.elements.filter((e) => e.kind === 'obstacle');
    for (const w of walls) {
      if (w.kind !== 'obstacle') continue;
      const startBlocked = w.x === 0 && w.y === 0;
      const goalBlocked = w.x === 0.9 && w.y === 0.9;
      expect(startBlocked).toBe(false);
      expect(goalBlocked).toBe(false);
    }
  });

  it('is BFS-solvable from start cell (0,0) to goal cell (9,9)', () => {
    // Build a 10x10 occupancy grid from the wall list, then BFS.
    const SIZE = 10;
    const blocked: boolean[][] = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => false),
    );
    for (const el of mazeBoard.elements) {
      if (el.kind !== 'obstacle') continue;
      const col = Math.round(el.x * 10);
      const row = Math.round(el.y * 10);
      if (col >= 0 && col < SIZE && row >= 0 && row < SIZE) blocked[row][col] = true;
    }
    const visited: boolean[][] = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => false),
    );
    const queue: Array<[number, number]> = [[0, 0]];
    visited[0][0] = true;
    let reached = false;
    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      if (row === 9 && col === 9) {
        reached = true;
        break;
      }
      const neighbours: Array<[number, number]> = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      for (const [r, c] of neighbours) {
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
        if (blocked[r][c] || visited[r][c]) continue;
        visited[r][c] = true;
        queue.push([r, c]);
      }
    }
    expect(reached).toBe(true);
  });
});
