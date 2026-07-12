import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSimStore } from '../store/sim-store';
import { useBoardsStore } from '../store/boards-store';
import { useGradeStore } from '../store/grade-store';
import { diagonalBoard } from './boards/grade5';
import type { Step } from './behaviors/schema';
import type { BoardState } from './boards/schema';

/**
 * Grade-5 validation: 45° kinematics through the full pressButton→tick
 * pipeline, and a scripted end-to-end solve of the bundled diagonal board —
 * which doubles as the board's solvability proof (referenced from grade5.ts).
 */

const blankBoard: BoardState = {
  version: 1,
  id: 'test-blank-g5',
  name: 'blank',
  width: 2,
  height: 2,
  elements: [{ kind: 'start', x: 1.0, y: 1.0, heading: 0 }],
};

/** Press once, run until the program completes (status leaves 'running'). */
const press = (steps: Step[], maxTicks = 1200): void => {
  useSimStore.getState().pressButton(1, steps);
  for (let i = 0; i < maxTicks; i++) {
    if (useSimStore.getState().status !== 'running') return;
    useSimStore.getState().tick(1 / 60);
  }
};

beforeEach(() => {
  localStorage.clear();
  useBoardsStore.getState().resetAll();
  useGradeStore.getState().setGrade('grade5');
});

afterEach(() => {
  useGradeStore.getState().setGrade('grade4');
});

describe('grade 5 — 45° kinematics (blank board)', () => {
  beforeEach(() => {
    useSimStore.getState().setBoard(blankBoard);
  });

  it('rotate 45 then drive 10cm lands at (d/√2, d/√2) from the start', () => {
    const start = { ...useSimStore.getState().robot };
    press([{ kind: 'rotate', degrees: 45 }]);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI / 4, 8);

    press([{ kind: 'drive', cm: 10 }]);
    const end = useSimStore.getState().robot;
    expect(end.x - start.x).toBeCloseTo(0.1 * Math.SQRT1_2, 4);
    expect(end.y - start.y).toBeCloseTo(0.1 * Math.SQRT1_2, 4);
  });

  it('two successive 45° turns compose to a clean 90° axis drive', () => {
    const start = { ...useSimStore.getState().robot };
    press([{ kind: 'rotate', degrees: 45 }]);
    press([{ kind: 'rotate', degrees: 45 }]);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI / 2, 8);

    press([{ kind: 'drive', cm: 10 }]);
    const end = useSimStore.getState().robot;
    expect(end.x - start.x).toBeCloseTo(0, 4);
    expect(end.y - start.y).toBeCloseTo(0.1, 4);
  });

  it('eight 45° turns return to exactly 360°', () => {
    const start = useSimStore.getState().robot.heading;
    for (let i = 0; i < 8; i++) press([{ kind: 'rotate', degrees: 45 }]);
    const total = ((useSimStore.getState().robot.heading - start) * 180) / Math.PI;
    expect(total).toBeCloseTo(360, 8);
  });
});

describe('grade 5 — diagonal board is solvable with 45° moves (documented path)', () => {
  it('the scripted sequence reaches the goal without stalling', () => {
    useSimStore.getState().setBoard(diagonalBoard);

    // The path documented in grade5.ts: diagonal out of the start corner,
    // east under the wall, south past its end, diagonal into the goal.
    const legs: Step[][] = [
      [{ kind: 'rotate', degrees: 45 }],
      [{ kind: 'drive', cm: 21 }],
      [{ kind: 'rotate', degrees: -45 }],
      [{ kind: 'drive', cm: 60 }],
      [{ kind: 'rotate', degrees: 90 }],
      [{ kind: 'drive', cm: 60 }],
      [{ kind: 'rotate', degrees: -45 }],
      [{ kind: 'drive', cm: 21 }],
    ];
    for (const leg of legs) {
      press(leg);
      expect(useSimStore.getState().status).not.toBe('stalled');
      if (useSimStore.getState().status === 'reached-goal') break;
    }
    expect(useSimStore.getState().status).toBe('reached-goal');
  });

  it('driving straight at the diagonal wall stalls the robot (penalty boundary)', () => {
    useSimStore.getState().setBoard(diagonalBoard);
    // From the start corner, 45° aims straight at the wall's midpoint (0.5, 0.5).
    press([{ kind: 'rotate', degrees: 45 }]);
    press([{ kind: 'drive', cm: 80 }]);
    expect(useSimStore.getState().status).toBe('stalled');
    expect(useSimStore.getState().robot.isStalled).toBe(true);
  });

  it('crossing a corner-cut hypotenuse stalls the robot', () => {
    useSimStore.getState().setBoard(diagonalBoard);
    // Drive east along the top edge into the NE corner triangle.
    press([{ kind: 'drive', cm: 100 }]);
    expect(useSimStore.getState().status).toBe('stalled');
    // Stalled at the hypotenuse (~x=0.79), well before the board edge —
    // proving the corner zone stopped it, not the out-of-bounds check.
    expect(useSimStore.getState().robot.x).toBeLessThan(0.9);
  });
});
