import { describe, it, expect, beforeEach } from 'vitest';
import { useSimStore } from '../store/sim-store';
import { defaultBoard } from './boards/default';
import { classProgramSample } from './behaviors/starter';
import type { Step } from './behaviors/schema';
import type { BoardState } from './boards/schema';

/**
 * Automation QA: each competition button must end at its exact expected
 * physics outcome — no manual screenshot QA needed.
 *
 * These tests drive the FULL sim-store pipeline (pressButton → tick → done
 * snap → final state) so they catch bugs anywhere in the chain. If any of
 * these regress, the kid will see misaligned moves / off-cardinal turns.
 *
 * Positions asserted to sub-millimeter precision (4 decimals = 0.1mm).
 * Headings asserted to 8 decimals (~ 6e-9 rad ≈ 3e-7 degrees).
 */

const stepsFor = (pressCount: number): Step[] => {
  const entry = classProgramSample.find((e) => e.pressCount === pressCount);
  if (!entry) throw new Error(`no starter program for press ${pressCount}`);
  return entry.steps;
};

const advance = (totalSeconds: number, dtSeconds: number): void => {
  const ticksNeeded = Math.ceil(totalSeconds / dtSeconds);
  const maxTicks = Math.max(ticksNeeded, 2000);
  for (let i = 0; i < maxTicks; i++) {
    useSimStore.getState().tick(dtSeconds);
    if (useSimStore.getState().status !== 'running') {
      for (let j = 0; j < 5; j++) useSimStore.getState().tick(dtSeconds);
      return;
    }
  }
};

const resetToBlankStart = (): void => {
  const blankBoard = {
    ...defaultBoard,
    elements: [
      { kind: 'start' as const, x: 0, y: 0, heading: 0 },
      { kind: 'goal' as const, x: 5, y: 5, toleranceCm: 1 },
    ],
  };
  useSimStore.getState().setBoard(blankBoard);
};

beforeEach(() => {
  resetToBlankStart();
});

describe('competition button validation — drive (btn1/2/3)', () => {
  it('btn1 (drive 10cm) lands at x=0.10 exactly with fixed dt=1/60', () => {
    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.10, 4);
    expect(robot.y).toBeCloseTo(0, 4);
    expect(robot.heading).toBeCloseTo(0, 8);
  });

  it('btn2 (drive 20cm) lands at x=0.20 exactly with fixed dt=1/60', () => {
    useSimStore.getState().pressButton(2, stepsFor(2));
    advance(4, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.20, 4);
    expect(robot.y).toBeCloseTo(0, 4);
    expect(robot.heading).toBeCloseTo(0, 8);
  });

  it('btn3 (drive 40cm) lands at x=0.40 exactly with fixed dt=1/60', () => {
    useSimStore.getState().pressButton(3, stepsFor(3));
    advance(6, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.40, 4);
    expect(robot.y).toBeCloseTo(0, 4);
    expect(robot.heading).toBeCloseTo(0, 8);
  });

  it('btn1 lands exactly even with worst-case variable dt (caps at 50ms)', () => {
    useSimStore.getState().pressButton(1, stepsFor(1));
    const dts = [1 / 60, 0.02, 1 / 60, 0.03, 1 / 60, 0.05, 1 / 60];
    let dtIdx = 0;
    for (let i = 0; i < 200; i++) {
      const dt = dts[dtIdx % dts.length];
      dtIdx++;
      useSimStore.getState().tick(dt);
      if (useSimStore.getState().status !== 'running') break;
    }
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.10, 4);
    expect(robot.y).toBeCloseTo(0, 4);
  });

  it('btn2 lands exactly even with worst-case variable dt', () => {
    useSimStore.getState().pressButton(2, stepsFor(2));
    const dts = [0.025, 1 / 60, 0.04, 1 / 60, 0.018, 0.05];
    let dtIdx = 0;
    for (let i = 0; i < 400; i++) {
      const dt = dts[dtIdx % dts.length];
      dtIdx++;
      useSimStore.getState().tick(dt);
      if (useSimStore.getState().status !== 'running') break;
    }
    expect(useSimStore.getState().robot.x).toBeCloseTo(0.20, 4);
  });
});

describe('competition button validation — rotate (btn4/5/6)', () => {
  it('btn4 (rotate +90°) lands at heading=π/2 exactly with fixed dt=1/60', () => {
    useSimStore.getState().pressButton(4, stepsFor(4));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.heading).toBeCloseTo(Math.PI / 2, 8);
    expect(robot.x).toBeCloseTo(0, 4);
    expect(robot.y).toBeCloseTo(0, 4);
  });

  it('btn5 (rotate -90°) lands at heading=-π/2 exactly with fixed dt=1/60', () => {
    useSimStore.getState().pressButton(5, stepsFor(5));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.heading).toBeCloseTo(-Math.PI / 2, 8);
    expect(robot.x).toBeCloseTo(0, 4);
    expect(robot.y).toBeCloseTo(0, 4);
  });

  it('btn6 (rotate 180°) lands at heading=π exactly with fixed dt=1/60', () => {
    useSimStore.getState().pressButton(6, stepsFor(6));
    advance(4, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.heading).toBeCloseTo(Math.PI, 8);
    expect(robot.x).toBeCloseTo(0, 4);
    expect(robot.y).toBeCloseTo(0, 4);
  });

  it('btn4 lands exactly at π/2 even with worst-case variable dt', () => {
    useSimStore.getState().pressButton(4, stepsFor(4));
    const dts = [0.018, 1 / 60, 0.03, 1 / 60, 0.05, 0.022];
    let dtIdx = 0;
    for (let i = 0; i < 400; i++) {
      const dt = dts[dtIdx % dts.length];
      dtIdx++;
      useSimStore.getState().tick(dt);
      if (useSimStore.getState().status !== 'running') break;
    }
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI / 2, 8);
  });

  it('btn6 lands exactly at π even with worst-case variable dt', () => {
    useSimStore.getState().pressButton(6, stepsFor(6));
    const dts = [0.05, 1 / 60, 0.04, 1 / 60, 0.022, 0.05];
    let dtIdx = 0;
    for (let i = 0; i < 600; i++) {
      const dt = dts[dtIdx % dts.length];
      dtIdx++;
      useSimStore.getState().tick(dt);
      if (useSimStore.getState().status !== 'running') break;
    }
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI, 8);
  });
});

describe('competition button validation — sequences (kid-realistic combos)', () => {
  it('btn4 then btn4 → heading = π exactly (two 90° rights = 180°)', () => {
    useSimStore.getState().pressButton(4, stepsFor(4));
    advance(3, 1 / 60);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI / 2, 8);

    useSimStore.getState().pressButton(4, stepsFor(4));
    advance(3, 1 / 60);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI, 8);
  });

  it('btn4 then btn5 → heading = 0 exactly (right then left cancels)', () => {
    useSimStore.getState().pressButton(4, stepsFor(4));
    advance(3, 1 / 60);
    useSimStore.getState().pressButton(5, stepsFor(5));
    advance(3, 1 / 60);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(0, 8);
  });

  it('btn1 then btn4 then btn1 → robot at (0.10, 0.10) after right turn then forward', () => {
    // The Y axis is +DOWN on screen (see types.ts heading comment). Positive
    // heading π/2 means facing +y (south). So after btn4 + btn1, the robot
    // should move 10cm in +y direction.
    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    expect(useSimStore.getState().robot.x).toBeCloseTo(0.10, 4);
    expect(useSimStore.getState().robot.y).toBeCloseTo(0, 4);

    useSimStore.getState().pressButton(4, stepsFor(4));
    advance(3, 1 / 60);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI / 2, 8);

    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.10, 4);
    expect(robot.y).toBeCloseTo(0.10, 4);
  });

  it('btn3 (40cm) then btn6 (180°) then btn3 → back at origin (full path round-trip)', () => {
    useSimStore.getState().pressButton(3, stepsFor(3));
    advance(6, 1 / 60);
    expect(useSimStore.getState().robot.x).toBeCloseTo(0.40, 4);

    useSimStore.getState().pressButton(6, stepsFor(6));
    advance(4, 1 / 60);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI, 8);

    useSimStore.getState().pressButton(3, stepsFor(3));
    advance(6, 1 / 60);
    const robot = useSimStore.getState().robot;
    // After 180° turn cos(π) = -1, so forward motion is in -x direction.
    expect(robot.x).toBeCloseTo(0, 4);
    expect(robot.y).toBeCloseTo(0, 4);
  });
});

describe('competition button validation — default board start position', () => {
  it('with defaultBoard start (0.05, 0.05), btn1 lands at (0.15, 0.05) — cell 1 center', () => {
    useSimStore.getState().setBoard(defaultBoard);
    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.15, 4);
    expect(robot.y).toBeCloseTo(0.05, 4);
  });

  it('with defaultBoard start (0.05, 0.05), btn2 lands at (0.25, 0.05) — cell 2 center', () => {
    useSimStore.getState().setBoard(defaultBoard);
    useSimStore.getState().pressButton(2, stepsFor(2));
    advance(4, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.25, 4);
    expect(robot.y).toBeCloseTo(0.05, 4);
  });

  it('with defaultBoard start (0.05, 0.05), btn3 lands at (0.45, 0.05) — cell 4 center', () => {
    useSimStore.getState().setBoard(defaultBoard);
    useSimStore.getState().pressButton(3, stepsFor(3));
    advance(6, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.45, 4);
    expect(robot.y).toBeCloseTo(0.05, 4);
  });
});

describe('guardrail — no diagonal movement after a cardinal turn', () => {
  // After a 90° turn the perpendicular axis must stay frozen during the next drive.
  // Any diagonal drift means the heading snap is broken.

  it('btn4 (right 90°) then btn1: x stays at 0, y moves exactly 10cm', () => {
    useSimStore.getState().pressButton(4, stepsFor(4));
    advance(3, 1 / 60);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI / 2, 8);

    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    // Heading is π/2 → cos=0, sin=1 → only y should change
    expect(robot.x).toBeCloseTo(0, 3);
    expect(robot.y).toBeCloseTo(0.10, 4);
  });

  it('btn5 (left 90°) then btn1: x stays at 0, y moves exactly -10cm', () => {
    // Start off-origin so -y move stays on-board
    const boardWithRoom: BoardState = {
      ...defaultBoard,
      elements: [
        { kind: 'start' as const, x: 0.5, y: 0.5, heading: 0 },
        { kind: 'goal' as const, x: 5, y: 5, toleranceCm: 1 },
      ],
    };
    useSimStore.getState().setBoard(boardWithRoom);

    useSimStore.getState().pressButton(5, stepsFor(5));
    advance(3, 1 / 60);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(-Math.PI / 2, 8);

    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    // Heading is -π/2 → cos=0, sin=-1 → only y should change (negative)
    expect(robot.x).toBeCloseTo(0.5, 3);
    expect(robot.y).toBeCloseTo(0.40, 4);
  });

  it('btn6 (180°) then btn1: y stays at 0, x moves exactly -10cm', () => {
    // Start with x room to go backward
    const boardWithRoom: BoardState = {
      ...defaultBoard,
      elements: [
        { kind: 'start' as const, x: 0.5, y: 0.5, heading: 0 },
        { kind: 'goal' as const, x: 5, y: 5, toleranceCm: 1 },
      ],
    };
    useSimStore.getState().setBoard(boardWithRoom);

    useSimStore.getState().pressButton(6, stepsFor(6));
    advance(4, 1 / 60);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI, 8);

    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    // Heading π → cos=-1, sin≈0 → only x should change (negative)
    expect(robot.y).toBeCloseTo(0.5, 3);
    expect(robot.x).toBeCloseTo(0.40, 4);
  });
});

describe('guardrail — boundary: robot stalls at board edge', () => {
  it('robot stalls when driven past the right edge of the board', () => {
    // Place robot near the right wall then drive forward
    const nearEdge: BoardState = {
      ...defaultBoard,
      elements: [
        { kind: 'start' as const, x: 0.97, y: 0.5, heading: 0 },
        { kind: 'goal' as const, x: 5, y: 5, toleranceCm: 1 },
      ],
    };
    useSimStore.getState().setBoard(nearEdge);
    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    expect(useSimStore.getState().status).toBe('stalled');
    expect(useSimStore.getState().robot.x).toBeLessThanOrEqual(1.0);
  });

  it('robot stalls when driven past the bottom edge of the board', () => {
    const nearBottom: BoardState = {
      ...defaultBoard,
      elements: [
        { kind: 'start' as const, x: 0.5, y: 0.97, heading: Math.PI / 2 },
        { kind: 'goal' as const, x: 5, y: 5, toleranceCm: 1 },
      ],
    };
    useSimStore.getState().setBoard(nearBottom);
    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    expect(useSimStore.getState().status).toBe('stalled');
    expect(useSimStore.getState().robot.y).toBeLessThanOrEqual(1.0);
  });

  it('robot does NOT stall when there is room to complete the move', () => {
    // Plenty of room — should complete normally
    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    expect(useSimStore.getState().status).not.toBe('stalled');
    expect(useSimStore.getState().robot.x).toBeCloseTo(0.10, 4);
  });
});
