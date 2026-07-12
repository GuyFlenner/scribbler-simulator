import { describe, it, expect } from 'vitest';
import { detectCollision, makeRobotState, tick } from './physics';
import { readObstacleLeft, readObstacleRight } from './sensors';
import { boardWallSegments, cornerHypotenuse, distPointToSegment } from './geometry';
import { ROBOT_COLLISION_RADIUS_M, type SimState } from './types';
import type { BoardState } from './boards/schema';
import { parseBoard } from './boards/schema';
import { diagonalBoard } from './boards/grade5';

const board = (elements: BoardState['elements']): BoardState => ({
  version: 1,
  id: 'walls-test',
  name: 'walls',
  width: 1,
  height: 1,
  elements,
});

const DIAG_WALL = {
  kind: 'wall' as const,
  x1: 0.3,
  y1: 0.7,
  x2: 0.7,
  y2: 0.3,
  thickness: 0.02,
};

describe('detectCollision — diagonal walls (capsule test)', () => {
  it('hits when the robot centre is within radius + half-thickness of the wall', () => {
    // Wall midpoint is (0.5, 0.5); park the robot just inside the threshold.
    const threshold = 0.01 + ROBOT_COLLISION_RADIUS_M;
    const offset = (threshold - 0.005) * Math.SQRT1_2;
    const robot = makeRobotState({ x: 0.5 - offset, y: 0.5 - offset, heading: 0 });
    expect(detectCollision(robot, board([DIAG_WALL])).hit).toBe(true);
  });

  it('does not hit when the robot is safely clear of the wall', () => {
    const robot = makeRobotState({ x: 0.2, y: 0.2, heading: 0 });
    expect(detectCollision(robot, board([DIAG_WALL])).hit).toBe(false);
  });

  it('corner-cut hypotenuse blocks like a wall', () => {
    const b = board([{ kind: 'corner', corner: 'se', size: 0.2 }]);
    // The se hypotenuse runs (0.8, 1.0) → (1.0, 0.8); park on its midpoint.
    const onEdge = makeRobotState({ x: 0.9, y: 0.9, heading: 0 });
    expect(detectCollision(onEdge, b).hit).toBe(true);
    const clear = makeRobotState({ x: 0.7, y: 0.7, heading: 0 });
    expect(detectCollision(clear, b).hit).toBe(false);
  });

  it('boards without walls/corners are unaffected (empty segment list)', () => {
    expect(boardWallSegments(board([]))).toEqual([]);
  });

  it('a driving robot stalls at the wall with heading preserved', () => {
    const b = board([DIAG_WALL, { kind: 'start', x: 0.3, y: 0.3, heading: Math.PI / 4 }]);
    let state: SimState = {
      robot: makeRobotState({ x: 0.3, y: 0.3, heading: Math.PI / 4, vLinear: 0.15 }),
      board: b,
      tickIndex: 0,
      status: 'running',
      runStartedAt: 0,
    };
    for (let i = 0; i < 240; i++) state = tick(state, 1 / 60);
    expect(state.status).toBe('stalled');
    expect(state.robot.isStalled).toBe(true);
    // Stopped at (not through) the boundary: centre still outside the capsule
    // by no more than one tick of travel.
    const dist = distPointToSegment(state.robot.x, state.robot.y, 0.3, 0.7, 0.7, 0.3);
    expect(dist).toBeGreaterThanOrEqual(0.01 + ROBOT_COLLISION_RADIUS_M - 1e-9);
    expect(dist).toBeLessThanOrEqual(0.01 + ROBOT_COLLISION_RADIUS_M + 0.15 / 60 + 1e-9);
  });
});

describe('cornerHypotenuse geometry', () => {
  it('derives the four hypotenuses in board coordinates', () => {
    expect(cornerHypotenuse('nw', 0.2, 1, 1)).toMatchObject({ x1: 0, y1: 0.2, x2: 0.2, y2: 0 });
    expect(cornerHypotenuse('ne', 0.2, 1, 1)).toMatchObject({ x1: 0.8, y1: 0, x2: 1, y2: 0.2 });
    expect(cornerHypotenuse('sw', 0.2, 1, 1)).toMatchObject({ x1: 0, y1: 0.8, x2: 0.2, y2: 1 });
    expect(cornerHypotenuse('se', 0.2, 1, 1)).toMatchObject({ x1: 0.8, y1: 1, x2: 1, y2: 0.8 });
  });
});

describe('IR obstacle sensors — walls reflect like obstacles', () => {
  it('a wall dead ahead within range triggers both IR sides', () => {
    // Vertical wall 10cm in front of the robot's nose.
    const b = board([{ kind: 'wall', x1: 0.6, y1: 0.3, x2: 0.6, y2: 0.7, thickness: 0.02 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readObstacleLeft(robot, b)).toBe(true);
    expect(readObstacleRight(robot, b)).toBe(true);
  });

  it('a wall beyond the 15cm range is not detected', () => {
    const b = board([{ kind: 'wall', x1: 0.8, y1: 0.3, x2: 0.8, y2: 0.7, thickness: 0.02 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readObstacleLeft(robot, b)).toBe(false);
    expect(readObstacleRight(robot, b)).toBe(false);
  });

  it('a wall behind the robot is outside the IR cone', () => {
    const b = board([{ kind: 'wall', x1: 0.4, y1: 0.3, x2: 0.4, y2: 0.7, thickness: 0.02 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readObstacleLeft(robot, b)).toBe(false);
    expect(readObstacleRight(robot, b)).toBe(false);
  });

  it('a corner-cut hypotenuse is sensed when approached head-on', () => {
    const b = board([{ kind: 'corner', corner: 'ne', size: 0.2 }]);
    // The ne hypotenuse runs (0.8,0)→(1.0,0.2); approach perpendicular to it
    // (heading -45°) so the closest point falls inside the 30° IR cone.
    const robot = makeRobotState({ x: 0.85, y: 0.15, heading: -Math.PI / 4 });
    expect(readObstacleLeft(robot, b) || readObstacleRight(robot, b)).toBe(true);
  });
});

describe('diagonal bundled board', () => {
  it('parses through the strict board validator', () => {
    expect(() => parseBoard(JSON.stringify(diagonalBoard))).not.toThrow();
  });

  it('has start, goal, two corner cuts, one wall, and two obstacles', () => {
    const kinds = diagonalBoard.elements.map((e) => e.kind).sort();
    expect(kinds).toEqual(
      ['corner', 'corner', 'goal', 'obstacle', 'obstacle', 'start', 'wall'].sort(),
    );
  });

  it('corner cuts do not cover the start or goal markers', () => {
    const start = diagonalBoard.elements.find((e) => e.kind === 'start');
    const goal = diagonalBoard.elements.find((e) => e.kind === 'goal');
    if (!start || start.kind !== 'start' || !goal || goal.kind !== 'goal') {
      throw new Error('missing markers');
    }
    for (const el of diagonalBoard.elements) {
      if (el.kind !== 'corner') continue;
      const hyp = cornerHypotenuse(el.corner, el.size, diagonalBoard.width, diagonalBoard.height);
      for (const p of [start, goal]) {
        const dist = distPointToSegment(p.x, p.y, hyp.x1, hyp.y1, hyp.x2, hyp.y2);
        expect(dist).toBeGreaterThan(ROBOT_COLLISION_RADIUS_M);
      }
    }
  });
});
