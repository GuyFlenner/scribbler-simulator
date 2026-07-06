import { describe, it, expect } from 'vitest';
import {
  readLineSensorLeft,
  readLineSensorRight,
  readObstacleLeft,
  readObstacleRight,
  readLightSensor,
  evalPredicate,
} from './sensors';
import { makeRobotState } from './physics';
import type { BoardState } from './boards/schema';

const board = (elements: BoardState['elements']): BoardState => ({
  version: 1,
  id: 'test',
  name: 'test',
  width: 1,
  height: 1,
  elements,
});

describe('readLineSensor — left vs right discrimination', () => {
  it('left sensor reads true when only the left line-sensor point is over a line', () => {
    const b = board([{ kind: 'line', x1: 0, y1: 0.53, x2: 1, y2: 0.53, thickness: 0.02 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readLineSensorLeft(robot, b)).toBe(true);
    expect(readLineSensorRight(robot, b)).toBe(false);
  });

  it('right sensor reads true when only the right line-sensor point is over a line', () => {
    const b = board([{ kind: 'line', x1: 0, y1: 0.47, x2: 1, y2: 0.47, thickness: 0.02 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readLineSensorLeft(robot, b)).toBe(false);
    expect(readLineSensorRight(robot, b)).toBe(true);
  });

  it('returns false for both when no line is under either sensor', () => {
    const b = board([{ kind: 'line', x1: 0, y1: 0.1, x2: 1, y2: 0.1, thickness: 0.02 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readLineSensorLeft(robot, b)).toBe(false);
    expect(readLineSensorRight(robot, b)).toBe(false);
  });
});

describe('readObstacleSensor — front-cone IR pair', () => {
  it('left IR detects an obstacle slightly to the left and within 15 cm', () => {
    const b = board([{ kind: 'obstacle', x: 0.63, y: 0.5, w: 0.04, h: 0.04 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readObstacleLeft(robot, b)).toBe(true);
    expect(readObstacleRight(robot, b)).toBe(false);
  });

  it('right IR detects an obstacle slightly to the right and within 15 cm', () => {
    const b = board([{ kind: 'obstacle', x: 0.63, y: 0.46, w: 0.04, h: 0.04 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readObstacleRight(robot, b)).toBe(true);
    expect(readObstacleLeft(robot, b)).toBe(false);
  });

  it('returns false when an obstacle is behind the robot', () => {
    const b = board([{ kind: 'obstacle', x: 0.3, y: 0.5, w: 0.04, h: 0.04 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readObstacleLeft(robot, b)).toBe(false);
    expect(readObstacleRight(robot, b)).toBe(false);
  });

  it('returns false when an obstacle is too far ahead (>15 cm)', () => {
    const b = board([{ kind: 'obstacle', x: 0.85, y: 0.5, w: 0.04, h: 0.04 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readObstacleLeft(robot, b)).toBe(false);
    expect(readObstacleRight(robot, b)).toBe(false);
  });
});

describe('readLightSensor — front-cone with inverse-square falloff', () => {
  it('returns 0 when there is no light source', () => {
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readLightSensor(robot, board([]))).toBe(0);
  });

  it('returns a positive value when a light is directly ahead', () => {
    const b = board([{ kind: 'light', x: 0.7, y: 0.5, intensity: 100 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readLightSensor(robot, b)).toBeGreaterThan(0);
  });

  it('returns 0 when a light is directly behind the robot (outside front cone)', () => {
    const b = board([{ kind: 'light', x: 0.3, y: 0.5, intensity: 100 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readLightSensor(robot, b)).toBe(0);
  });

  it('a closer light produces a higher reading than a farther one (same intensity)', () => {
    const close = board([{ kind: 'light', x: 0.6, y: 0.5, intensity: 100 }]);
    const far = board([{ kind: 'light', x: 0.95, y: 0.5, intensity: 100 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    expect(readLightSensor(robot, close)).toBeGreaterThan(readLightSensor(robot, far));
  });

  it('clamps the reading to 0..255', () => {
    const b = board([{ kind: 'light', x: 0.51, y: 0.5, intensity: 1e9 }]);
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    const v = readLightSensor(robot, b);
    expect(v).toBeLessThanOrEqual(255);
    expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe('evalPredicate — sensor predicate evaluation', () => {
  const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
  const b = board([
    { kind: 'line', x1: 0, y1: 0.53, x2: 1, y2: 0.53, thickness: 0.02 },
    { kind: 'light', x: 0.6, y: 0.5, intensity: 100 },
  ]);

  it('evaluates a leaf predicate (line_left)', () => {
    expect(evalPredicate({ kind: 'line_left' }, robot, b)).toBe(true);
    expect(evalPredicate({ kind: 'line_right' }, robot, b)).toBe(false);
  });

  it('evaluates a "not" predicate', () => {
    expect(evalPredicate({ kind: 'not', inner: { kind: 'line_right' } }, robot, b)).toBe(true);
  });

  it('evaluates an "and" predicate', () => {
    expect(
      evalPredicate(
        {
          kind: 'and',
          left: { kind: 'line_left' },
          right: { kind: 'not', inner: { kind: 'line_right' } },
        },
        robot,
        b,
      ),
    ).toBe(true);
  });

  it('evaluates an "or" predicate', () => {
    expect(
      evalPredicate(
        { kind: 'or', left: { kind: 'line_right' }, right: { kind: 'line_left' } },
        robot,
        b,
      ),
    ).toBe(true);
  });

  it('evaluates a light_above threshold predicate', () => {
    expect(evalPredicate({ kind: 'light_above', threshold: 1 }, robot, b)).toBe(true);
    expect(evalPredicate({ kind: 'light_above', threshold: 1e6 }, robot, b)).toBe(false);
  });
});
