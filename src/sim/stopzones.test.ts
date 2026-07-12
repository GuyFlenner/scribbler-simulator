import { describe, it, expect, beforeEach } from 'vitest';
import { makeRobotState, tick } from './physics';
import { parseBoard } from './boards/schema';
import { junctionDrillBoard } from './boards/junction';
import { figureEightBoard } from './boards/tracks';
import { useSimStore } from '../store/sim-store';
import { useBoardsStore } from '../store/boards-store';
import type { BoardState } from './boards/schema';
import type { SimState } from './types';
import type { Step } from './behaviors/schema';

const zoneBoard = (extra: BoardState['elements'] = []): BoardState => ({
  version: 1,
  id: 'zone-test',
  name: 'zones',
  width: 1,
  height: 1,
  elements: [
    { kind: 'start', x: 0.1, y: 0.5, heading: 0 },
    { kind: 'stopzone', x: 0.5, y: 0.5, toleranceCm: 6, requiredStopSeconds: 2, sign: 'stop' },
    ...extra,
  ],
});

const runState = (board: BoardState, robot = makeRobotState({ x: 0.1, y: 0.5 })): SimState => ({
  robot,
  board,
  tickIndex: 0,
  status: 'running',
  runStartedAt: 0,
});

const advanceState = (state: SimState, ticks: number): SimState => {
  let s = state;
  for (let i = 0; i < ticks; i++) s = tick(s, 1 / 60);
  return s;
};

describe('stop zones — physics semantics', () => {
  it('driving straight through a stop sign stalls the robot on exit', () => {
    let state = runState(zoneBoard(), makeRobotState({ x: 0.1, y: 0.5, vLinear: 0.15 }));
    state = advanceState(state, 60 * 5);
    expect(state.status).toBe('stalled');
    expect(state.robot.isStalled).toBe(true);
    // Stalled right at the zone's far edge (0.5 + 0.06), not later.
    expect(state.robot.x).toBeLessThan(0.6);
    expect(state.robot.x).toBeGreaterThan(0.5);
  });

  it('stopping inside for the required time satisfies the zone', () => {
    let state = runState(zoneBoard(), makeRobotState({ x: 0.1, y: 0.5, vLinear: 0.15 }));
    // Drive into the zone centre (~0.4m at 0.15 m/s ≈ 160 ticks), then stop.
    state = advanceState(state, 160);
    expect(Math.hypot(state.robot.x - 0.5, 0)).toBeLessThan(0.06);
    state = { ...state, robot: { ...state.robot, vLinear: 0, vAngular: 0 } };
    state = advanceState(state, 60 * 2.2);
    expect(state.stopZoneProgress?.[0].everSatisfied).toBe(true);
    // Drive on out — no stall.
    state = { ...state, robot: { ...state.robot, vLinear: 0.15 } };
    state = advanceState(state, 60 * 2);
    expect(state.status).not.toBe('stalled');
  });

  it('checkpoints (0s) satisfy on pass-through without stopping', () => {
    const board = zoneBoard();
    board.elements[1] = {
      kind: 'stopzone',
      x: 0.5,
      y: 0.5,
      toleranceCm: 6,
      requiredStopSeconds: 0,
      sign: 'checkpoint',
    };
    let state = runState(board, makeRobotState({ x: 0.1, y: 0.5, vLinear: 0.15 }));
    state = advanceState(state, 60 * 5);
    expect(state.status).not.toBe('stalled');
    expect(state.stopZoneProgress?.[0].everSatisfied).toBe(true);
  });

  it('the goal does not fire until every zone has been satisfied', () => {
    // Checkpoint far from the direct path to the goal.
    const board: BoardState = {
      version: 1,
      id: 'gated',
      name: 'gated',
      width: 1,
      height: 1,
      elements: [
        { kind: 'start', x: 0.1, y: 0.5, heading: 0 },
        { kind: 'goal', x: 0.5, y: 0.5, toleranceCm: 5 },
        {
          kind: 'stopzone',
          x: 0.2,
          y: 0.9,
          toleranceCm: 6,
          requiredStopSeconds: 0,
          sign: 'checkpoint',
        },
      ],
    };
    // Drive straight over the goal without visiting the checkpoint.
    let state = runState(board, makeRobotState({ x: 0.4, y: 0.5, vLinear: 0.15 }));
    state = advanceState(state, 60);
    expect(state.status).toBe('running'); // crossed the goal point — no finish

    // Now with the checkpoint pre-satisfied, the same crossing finishes.
    let ok = runState(board, makeRobotState({ x: 0.4, y: 0.5, vLinear: 0.15 }));
    ok = {
      ...ok,
      stopZoneProgress: [
        { stoppedSeconds: 0, satisfied: true, everSatisfied: true, wasInside: false },
      ],
    };
    ok = advanceState(ok, 60);
    expect(ok.status).toBe('reached-goal');
  });
});

describe('stop zones — schema validation', () => {
  it('parses valid zones (figure-8 and junction boards validate)', () => {
    expect(() => parseBoard(JSON.stringify(figureEightBoard))).not.toThrow();
    expect(() => parseBoard(JSON.stringify(junctionDrillBoard))).not.toThrow();
  });

  it('rejects invalid sign values and negative stop times', () => {
    const bad = (element: object): string =>
      JSON.stringify({ version: 1, id: 'x', name: 'x', width: 1, height: 1, elements: [element] });
    expect(() =>
      parseBoard(
        bad({
          kind: 'stopzone',
          x: 0.5,
          y: 0.5,
          toleranceCm: 6,
          requiredStopSeconds: 2,
          sign: 'yield',
        }),
      ),
    ).toThrow(/sign/i);
    expect(() =>
      parseBoard(
        bad({ kind: 'stopzone', x: 0.5, y: 0.5, toleranceCm: 6, requiredStopSeconds: -1 }),
      ),
    ).toThrow(/requiredStopSeconds/);
  });
});

describe('junction drill — prescribed route end-to-end (grade-4 starter moves)', () => {
  const press = (steps: Step[], maxTicks = 1200): void => {
    useSimStore.getState().pressButton(1, steps);
    for (let i = 0; i < maxTicks; i++) {
      if (useSimStore.getState().status !== 'running') return;
      useSimStore.getState().tick(1 / 60);
    }
  };
  const idle = (ticks: number): void => {
    for (let i = 0; i < ticks; i++) useSimStore.getState().tick(1 / 60);
  };

  beforeEach(() => {
    localStorage.clear();
    useBoardsStore.getState().resetAll();
    useSimStore.getState().setBoard(junctionDrillBoard);
  });

  it('the documented 9-press right-straight-right solution reaches the finish', () => {
    press([{ kind: 'drive', cm: 20 }]); // north toward the stop sign
    press([{ kind: 'drive', cm: 10 }]); // ends inside the 🛑 zone
    idle(75); // full stop for >1s — satisfies the sign
    press([{ kind: 'drive', cm: 10 }]); // to junction A
    press([{ kind: 'rotate', degrees: 90 }]); // RIGHT → east
    press([{ kind: 'drive', cm: 40 }]); // through 📍1, STRAIGHT past junction B
    press([{ kind: 'drive', cm: 20 }]); // through 📍2, to junction C
    press([{ kind: 'rotate', degrees: 90 }]); // RIGHT → south
    press([{ kind: 'drive', cm: 20 }]); // through 📍3
    press([{ kind: 'drive', cm: 10 }]); // finish
    expect(useSimStore.getState().status).toBe('reached-goal');
  });

  it('running the stop sign stalls the robot', () => {
    press([{ kind: 'drive', cm: 40 }]); // blasts through the 🛑 without stopping
    expect(useSimStore.getState().status).toBe('stalled');
  });

  it('a cross-country shortcut to the finish never scores', () => {
    press([{ kind: 'drive', cm: 20 }]);
    press([{ kind: 'drive', cm: 10 }]);
    idle(75);
    // Teleport next to the finish with all checkpoints unvisited.
    useSimStore.setState({
      robot: { ...useSimStore.getState().robot, x: 0.8, y: 0.8 },
      status: 'running',
    });
    idle(30);
    expect(useSimStore.getState().status).toBe('running'); // goal stays locked
  });
});
