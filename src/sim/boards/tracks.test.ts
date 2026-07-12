import { describe, it, expect } from 'vitest';
import {
  TRACK_THICKNESS_M,
  figureEightBoard,
  figureEightPoint,
  sampleCurve,
  serpentineBoard,
  serpentinePoint,
} from './tracks';
import { parseBoard } from './schema';
import { distPointToSegment } from '../geometry';
import type { BoardState, LineSegment } from './schema';

const trackSegments = (board: BoardState): LineSegment[] =>
  board.elements.filter((e): e is LineSegment => e.kind === 'line');

const distToTrack = (x: number, y: number, board: BoardState): number =>
  Math.min(...trackSegments(board).map((s) => distPointToSegment(x, y, s.x1, s.y1, s.x2, s.y2)));

describe('sampleCurve', () => {
  it('produces a gap-free chain (each segment ends where the next starts)', () => {
    const segments = sampleCurve(figureEightPoint, 64);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].x1).toBeCloseTo(segments[i - 1].x2, 12);
      expect(segments[i].y1).toBeCloseTo(segments[i - 1].y2, 12);
    }
  });

  it('uses the official 50mm Robotraffic line width by default', () => {
    expect(TRACK_THICKNESS_M).toBe(0.05);
    for (const s of sampleCurve(serpentinePoint, 32)) {
      expect(s.thickness).toBe(TRACK_THICKNESS_M);
    }
  });
});

describe.each([
  ['figure-8', figureEightBoard],
  ['serpentine', serpentineBoard],
])('%s track board', (_name, board) => {
  it('parses through the strict board validator', () => {
    expect(() => parseBoard(JSON.stringify(board))).not.toThrow();
  });

  it('keeps every track point inside the board with a margin', () => {
    for (const s of trackSegments(board)) {
      for (const [x, y] of [
        [s.x1, s.y1],
        [s.x2, s.y2],
      ]) {
        expect(x).toBeGreaterThanOrEqual(0.05);
        expect(x).toBeLessThanOrEqual(0.95);
        expect(y).toBeGreaterThanOrEqual(0.05);
        expect(y).toBeLessThanOrEqual(0.95);
      }
    }
  });

  it('places the start marker exactly on the line and the goal on the track', () => {
    const start = board.elements.find((e) => e.kind === 'start');
    const goal = board.elements.find((e) => e.kind === 'goal');
    if (!start || start.kind !== 'start' || !goal || goal.kind !== 'goal') {
      throw new Error('markers missing');
    }
    expect(distToTrack(start.x, start.y, board)).toBeLessThan(1e-9);
    expect(distToTrack(goal.x, goal.y, board)).toBeLessThan(1e-9);
    // Goal is far enough from the start that it can't trigger immediately.
    expect(Math.hypot(goal.x - start.x, goal.y - start.y)).toBeGreaterThan(0.15);
  });
});

describe('figure-8 geometry', () => {
  it('self-intersects exactly at the board centre (the crossing)', () => {
    // The lemniscate passes (0.5, 0.5) at t=0.25 and t=0.75.
    expect(figureEightPoint(0.25).x).toBeCloseTo(0.5, 9);
    expect(figureEightPoint(0.25).y).toBeCloseTo(0.5, 9);
    expect(figureEightPoint(0.75).x).toBeCloseTo(0.5, 9);
    expect(figureEightPoint(0.75).y).toBeCloseTo(0.5, 9);
  });

  it('start heading is the curve tangent (straight down at the right lobe end)', () => {
    const start = figureEightBoard.elements.find((e) => e.kind === 'start');
    if (!start || start.kind !== 'start') throw new Error('start missing');
    expect(start.heading).toBeCloseTo(Math.PI / 2, 9);
    // Tangent check by finite difference: the curve at t≈0 moves in +y only.
    const p0 = figureEightPoint(0);
    const p1 = figureEightPoint(0.002);
    expect(Math.atan2(p1.y - p0.y, p1.x - p0.x)).toBeCloseTo(Math.PI / 2, 1);
  });
});
