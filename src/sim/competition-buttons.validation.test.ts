import { describe, it, expect, beforeEach } from 'vitest';
import { useSimStore } from '../store/sim-store';
import { defaultBoard } from './boards/default';
import { classProgramSample } from './behaviors/starter';
import type { Step } from './behaviors/schema';

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
  // Cap at a high number so tests can't hang if the program never terminates.
  const maxTicks = Math.max(ticksNeeded, 2000);
  for (let i = 0; i < maxTicks; i++) {
    useSimStore.getState().tick(dtSeconds);
    if (useSimStore.getState().status !== 'running') {
      // Status transitions out of 'running' when program ends + collisions
      // resolve. But the press handler keeps status='running' until the
      // generator returns done — once it does, vLinear/vAngular are zero
      // and a few extra ticks won't move the robot. Run a few more for safety.
      for (let j = 0; j < 5; j++) useSimStore.getState().tick(dtSeconds);
      return;
    }
  }
};

const resetToBlankStart = (): void => {
  // Use a board with NO obstacles so collision detection never interferes
  // with the physics under test. Start at origin so absolute positions are
  // trivial to assert (start.x = 0, after 12cm forward → x = 0.12 exactly).
  const blankBoard = {
    ...defaultBoard,
    elements: [
      { kind: 'start' as const, x: 0, y: 0, heading: 0 },
      // Goal placed far away so we don't trigger reached-goal mid-test.
      { kind: 'goal' as const, x: 5, y: 5, toleranceCm: 1 },
    ],
  };
  useSimStore.getState().setBoard(blankBoard);
};

beforeEach(() => {
  resetToBlankStart();
});

describe('competition button validation — drive (btn1/2/3)', () => {
  it('btn1 (drive 12cm) lands at x=0.12 exactly with fixed dt=1/60', () => {
    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.12, 4);
    expect(robot.y).toBeCloseTo(0, 4);
    expect(robot.heading).toBeCloseTo(0, 8);
  });

  it('btn2 (drive 24cm) lands at x=0.24 exactly with fixed dt=1/60', () => {
    useSimStore.getState().pressButton(2, stepsFor(2));
    advance(4, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.24, 4);
    expect(robot.y).toBeCloseTo(0, 4);
    expect(robot.heading).toBeCloseTo(0, 8);
  });

  it('btn3 (drive 48cm) lands at x=0.48 exactly with fixed dt=1/60', () => {
    useSimStore.getState().pressButton(3, stepsFor(3));
    advance(6, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.48, 4);
    expect(robot.y).toBeCloseTo(0, 4);
    expect(robot.heading).toBeCloseTo(0, 8);
  });

  it('btn1 lands exactly even with worst-case variable dt (caps at 50ms)', () => {
    useSimStore.getState().pressButton(1, stepsFor(1));
    // Mix small + large dt values to exercise the corrective-velocity path
    const dts = [1 / 60, 0.02, 1 / 60, 0.03, 1 / 60, 0.05, 1 / 60];
    let dtIdx = 0;
    for (let i = 0; i < 200; i++) {
      const dt = dts[dtIdx % dts.length];
      dtIdx++;
      useSimStore.getState().tick(dt);
      if (useSimStore.getState().status !== 'running') break;
    }
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.12, 4);
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
    expect(useSimStore.getState().robot.x).toBeCloseTo(0.24, 4);
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

  it('btn1 then btn4 then btn1 → robot at (0.12, 0.12) after right turn then forward', () => {
    // The Y axis is +DOWN on screen (see types.ts heading comment). Positive
    // heading π/2 means facing +y (south). So after btn4 + btn1, the robot
    // should move 12cm in +y direction.
    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    expect(useSimStore.getState().robot.x).toBeCloseTo(0.12, 4);
    expect(useSimStore.getState().robot.y).toBeCloseTo(0, 4);

    useSimStore.getState().pressButton(4, stepsFor(4));
    advance(3, 1 / 60);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI / 2, 8);

    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.12, 4);
    expect(robot.y).toBeCloseTo(0.12, 4);
  });

  it('btn3 (48cm) then btn6 (180°) then btn3 → back at origin (full path round-trip)', () => {
    useSimStore.getState().pressButton(3, stepsFor(3));
    advance(6, 1 / 60);
    expect(useSimStore.getState().robot.x).toBeCloseTo(0.48, 4);

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
  it('with defaultBoard start (0.06, 0.06), btn1 lands at (0.18, 0.06) — cell 1 center', () => {
    useSimStore.getState().setBoard(defaultBoard);
    useSimStore.getState().pressButton(1, stepsFor(1));
    advance(3, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.18, 4);
    expect(robot.y).toBeCloseTo(0.06, 4);
  });

  it('with defaultBoard start (0.06, 0.06), btn2 lands at (0.30, 0.06) — cell 2 center', () => {
    useSimStore.getState().setBoard(defaultBoard);
    useSimStore.getState().pressButton(2, stepsFor(2));
    advance(4, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.30, 4);
    expect(robot.y).toBeCloseTo(0.06, 4);
  });

  it('with defaultBoard start (0.06, 0.06), btn3 lands at (0.54, 0.06) — cell 4 center', () => {
    useSimStore.getState().setBoard(defaultBoard);
    useSimStore.getState().pressButton(3, stepsFor(3));
    advance(6, 1 / 60);
    const robot = useSimStore.getState().robot;
    expect(robot.x).toBeCloseTo(0.54, 4);
    expect(robot.y).toBeCloseTo(0.06, 4);
  });
});
