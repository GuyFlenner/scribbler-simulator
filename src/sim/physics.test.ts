import { describe, it, expect } from 'vitest';
import { tick, makeRobotState, detectCollision } from './physics';
import { defaultBoard } from './boards/default';
import type { SimState } from './types';

const initialState = (overrides?: Partial<SimState>): SimState => ({
  robot: makeRobotState({ x: 0, y: 0, heading: 0 }),
  board: defaultBoard,
  tickIndex: 0,
  status: 'idle',
  runStartedAt: null,
  ...overrides,
});

describe('physics.tick — drive forward', () => {
  it('moves 0.30 m forward at 0.15 m/s after 2 simulated seconds', () => {
    const robot = makeRobotState({ x: 0, y: 0, heading: 0, vLinear: 0.15 });
    let state: SimState = { ...initialState(), robot, status: 'running', runStartedAt: 0 };
    for (let i = 0; i < 120; i++) state = tick(state, 1 / 60);
    expect(state.robot.x).toBeCloseTo(0.3, 2);
    expect(state.robot.y).toBeCloseTo(0, 2);
  });

  it('moves 0.30 m backward when vLinear is negative', () => {
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0, vLinear: -0.15 });
    let state: SimState = { ...initialState(), robot, status: 'running', runStartedAt: 0 };
    for (let i = 0; i < 120; i++) state = tick(state, 1 / 60);
    expect(state.robot.x).toBeCloseTo(0.2, 2);
  });

  it('rotation in place changes heading without moving the centre', () => {
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0, vAngular: Math.PI / 2 });
    let state: SimState = { ...initialState(), robot, status: 'running', runStartedAt: 0 };
    for (let i = 0; i < 60; i++) state = tick(state, 1 / 60);
    expect(state.robot.heading).toBeCloseTo(Math.PI / 2, 2);
    expect(state.robot.x).toBeCloseTo(0.5, 3);
    expect(state.robot.y).toBeCloseTo(0.5, 3);
  });

  it('produces identical output for two identical tick sequences (determinism)', () => {
    const seed = (): SimState => ({
      ...initialState(),
      robot: makeRobotState({ x: 0, y: 0, heading: 0, vLinear: 0.15, vAngular: 0.5 }),
      status: 'running',
      runStartedAt: 0,
    });
    let a = seed();
    let b = seed();
    for (let i = 0; i < 1000; i++) {
      a = tick(a, 1 / 60);
      b = tick(b, 1 / 60);
    }
    expect(a.robot).toEqual(b.robot);
    expect(a.tickIndex).toBe(b.tickIndex);
  });

  it('encoder ticks differ between wheels during in-place rotation', () => {
    const robot = makeRobotState({ x: 0, y: 0, heading: 0, vAngular: 1 });
    let state: SimState = { ...initialState(), robot, status: 'running', runStartedAt: 0 };
    for (let i = 0; i < 60; i++) state = tick(state, 1 / 60);
    expect(state.robot.encoderTicksLeft).not.toBe(state.robot.encoderTicksRight);
  });
});

describe('physics.tick — collision', () => {
  it('stops the robot at an obstacle and sets isStalled', () => {
    const board = {
      ...defaultBoard,
      elements: [{ kind: 'obstacle' as const, x: 0.1, y: -0.05, w: 0.05, h: 0.1 }],
    };
    const robot = makeRobotState({ x: 0, y: 0, heading: 0, vLinear: 0.15 });
    let state: SimState = { robot, board, tickIndex: 0, status: 'running', runStartedAt: 0 };
    for (let i = 0; i < 60; i++) state = tick(state, 1 / 60);
    expect(state.robot.isStalled).toBe(true);
    expect(state.robot.x).toBeLessThan(0.15);
    expect(state.status).toBe('stalled');
  });

  it('detectCollision returns hit=false for a clear path', () => {
    const robot = makeRobotState({ x: 0.5, y: 0.5, heading: 0 });
    const result = detectCollision(robot, defaultBoard);
    expect(result.hit).toBe(false);
  });
});

describe('physics.tick — goal detection', () => {
  it('marks the run as reached-goal when the robot is within tolerance of the goal', () => {
    const goal = defaultBoard.elements.find((el) => el.kind === 'goal');
    if (!goal || goal.kind !== 'goal') throw new Error('default board must have a goal');
    const robot = makeRobotState({ x: goal.x, y: goal.y, heading: 0 });
    let state: SimState = {
      robot,
      board: defaultBoard,
      tickIndex: 0,
      status: 'running',
      runStartedAt: 0,
    };
    state = tick(state, 1 / 60);
    expect(state.status).toBe('reached-goal');
  });
});
