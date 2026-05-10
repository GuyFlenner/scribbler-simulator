import { describe, it, expect } from 'vitest';
import { startProgram } from './runtime';
import { makeRobotState, tick } from './physics';
import type { Step } from './behaviors/schema';
import type { SimState } from './types';
import type { BoardState } from './boards/schema';

const blankBoard: BoardState = {
  version: 1,
  id: 'blank',
  name: 'blank',
  width: 1,
  height: 1,
  elements: [{ kind: 'goal', x: 99, y: 99, toleranceCm: 1 }],
};

const runProgram = (
  steps: Step[],
  board: BoardState = blankBoard,
  maxTicks = 1000,
): { state: SimState; ticksUsed: number; done: boolean } => {
  const program = startProgram(steps);
  let state: SimState = {
    robot: makeRobotState({ x: 0.5, y: 0.5, heading: 0 }),
    board,
    tickIndex: 0,
    status: 'running',
    runStartedAt: 0,
  };
  let done = false;
  let ticksUsed = 0;
  for (let i = 0; i < maxTicks; i++) {
    ticksUsed = i + 1;
    const out = program.step(state.robot, 1 / 60, state.board);
    state = {
      ...state,
      robot: { ...state.robot, vLinear: out.vLinear, vAngular: out.vAngular },
    };
    state = tick(state, 1 / 60);
    if (out.done) {
      done = true;
      break;
    }
  }
  return { state, ticksUsed, done };
};

describe('runtime — repeat block', () => {
  it('executes drive 5 cm three times for total ~15 cm', () => {
    const { state, done } = runProgram([
      { kind: 'repeat', times: 3, body: [{ kind: 'drive', cm: 5 }] },
    ]);
    expect(done).toBe(true);
    expect(state.robot.x - 0.5).toBeCloseTo(0.15, 1);
  });
});

describe('runtime — if block (sensor predicate)', () => {
  it('runs the then-branch when the predicate is true', () => {
    const board: BoardState = {
      ...blankBoard,
      elements: [
        ...blankBoard.elements,
        { kind: 'line', x1: 0, y1: 0.53, x2: 1, y2: 0.53, thickness: 0.02 },
      ],
    };
    const { state, done } = runProgram(
      [
        {
          kind: 'if',
          condition: { kind: 'line_left' },
          then: [{ kind: 'drive', cm: 5 }],
          else: [{ kind: 'drive', cm: -5 }],
        },
      ],
      board,
    );
    expect(done).toBe(true);
    expect(state.robot.x - 0.5).toBeCloseTo(0.05, 1);
  });

  it('runs the else-branch when the predicate is false', () => {
    const { state, done } = runProgram([
      {
        kind: 'if',
        condition: { kind: 'line_left' },
        then: [{ kind: 'drive', cm: 5 }],
        else: [{ kind: 'drive', cm: -5 }],
      },
    ]);
    expect(done).toBe(true);
    expect(state.robot.x - 0.5).toBeCloseTo(-0.05, 1);
  });
});

describe('runtime — turn-direction convention', () => {
  // Locks in the screen-coord convention: positive degrees = right turn (CW on screen).
  // Repro guard for the press-4-rotates-the-wrong-way bug.
  it('rotate with positive degrees increases heading (right turn on screen)', () => {
    const { state, done } = runProgram([{ kind: 'rotate', degrees: 90 }]);
    expect(done).toBe(true);
    expect(state.robot.heading).toBeGreaterThan(0);
    expect(state.robot.heading).toBeCloseTo(Math.PI / 2, 1);
  });

  it('rotate with negative degrees decreases heading (left turn on screen)', () => {
    const { state, done } = runProgram([{ kind: 'rotate', degrees: -90 }]);
    expect(done).toBe(true);
    expect(state.robot.heading).toBeLessThan(0);
    expect(state.robot.heading).toBeCloseTo(-Math.PI / 2, 1);
  });
});

describe('runtime — drive_wheels', () => {
  it('drives straight when both wheels at equal positive speed', () => {
    const { state, done } = runProgram([
      { kind: 'drive_wheels', leftSpeedPct: 50, rightSpeedPct: 50, durationMs: 1000 },
    ]);
    expect(done).toBe(true);
    expect(state.robot.x - 0.5).toBeGreaterThan(0.05);
    expect(state.robot.heading).toBeCloseTo(0, 2);
  });

  it('rotates in place when wheels are equal-and-opposite', () => {
    const { state, done } = runProgram([
      { kind: 'drive_wheels', leftSpeedPct: -50, rightSpeedPct: 50, durationMs: 500 },
    ]);
    expect(done).toBe(true);
    expect(Math.abs(state.robot.heading)).toBeGreaterThan(0.2);
    expect(state.robot.x).toBeCloseTo(0.5, 2);
  });
});

describe('runtime — drive_arc', () => {
  it('completes a 90° arc and changes heading by π/2 radians', () => {
    const { state, done } = runProgram([
      { kind: 'drive_arc', radiusCm: 20, degrees: 90, speedPct: 50 },
    ]);
    expect(done).toBe(true);
    expect(Math.abs(state.robot.heading)).toBeGreaterThan(1.4);
    expect(Math.abs(state.robot.heading)).toBeLessThan(1.7);
  });

  it('with radius 0 behaves like in-place rotation', () => {
    const { state, done } = runProgram([
      { kind: 'drive_arc', radiusCm: 0, degrees: 45 },
    ]);
    expect(done).toBe(true);
    expect(state.robot.heading).toBeCloseTo(Math.PI / 4, 1);
    expect(state.robot.x).toBeCloseTo(0.5, 3);
  });
});

describe('runtime — while block', () => {
  it('exits the while-loop as soon as the predicate becomes true (line crossing)', () => {
    const board: BoardState = {
      ...blankBoard,
      elements: [
        ...blankBoard.elements,
        { kind: 'line', x1: 0.75, y1: 0, x2: 0.75, y2: 1, thickness: 0.04 },
      ],
    };
    const { state, done } = runProgram(
      [
        {
          kind: 'while',
          condition: { kind: 'not', inner: { kind: 'line_left' } },
          body: [{ kind: 'drive', cm: 1 }],
          maxIterations: 200,
        },
      ],
      board,
      3000,
    );
    expect(done).toBe(true);
    expect(state.robot.x).toBeGreaterThan(0.6);
    expect(state.robot.x).toBeLessThan(0.85);
  });

  it('honours maxIterations to prevent infinite loops', () => {
    const { done, ticksUsed } = runProgram(
      [
        {
          kind: 'while',
          condition: { kind: 'line_left' },
          body: [{ kind: 'drive', cm: 1 }],
          maxIterations: 5,
        },
      ],
      blankBoard,
      2000,
    );
    expect(done).toBe(true);
    expect(ticksUsed).toBeLessThan(2000);
  });
});
