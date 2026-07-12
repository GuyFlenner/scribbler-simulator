import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSimStore } from './sim-store';
import { useBoardsStore } from './boards-store';
import { useGradeStore } from './grade-store';
import type { BoardState } from '../sim/boards/schema';
import type { Step } from '../sim/behaviors/schema';

const ROTATE_RIGHT_90: Step[] = [{ kind: 'rotate', degrees: 90 }];
const DRIVE_10: Step[] = [{ kind: 'drive', cm: 10 }];

const blankBoard: BoardState = {
  version: 1,
  id: 'test-blank',
  name: 'blank',
  width: 2,
  height: 2,
  elements: [{ kind: 'start', x: 1.0, y: 1.0, heading: 0 }],
};

const advance = (ticks: number): void => {
  const tick = useSimStore.getState().tick;
  for (let i = 0; i < ticks; i++) tick(1 / 60);
};

beforeEach(() => {
  localStorage.clear();
  useBoardsStore.getState().resetAll();
  useSimStore.getState().setBoard(blankBoard);
});

describe('sim-store — heading snap on natural completion (regression)', () => {
  it('rotate +90° then drive 10cm in separate presses: drive is along +y axis, zero x-drift', () => {
    useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
    advance(120);

    const afterRotate = useSimStore.getState().robot;
    expect(afterRotate.heading).toBeCloseTo(Math.PI / 2, 9);

    useSimStore.getState().pressButton(1, DRIVE_10);
    advance(120);

    const afterDrive = useSimStore.getState().robot;
    expect(afterDrive.x - afterRotate.x).toBeCloseTo(0, 9);
    expect(afterDrive.y - afterRotate.y).toBeCloseTo(0.1, 3);
    expect(afterDrive.heading).toBeCloseTo(Math.PI / 2, 9);
  });

  it('rotate 180° then drive 10cm in separate presses: drive is along -x axis, zero y-drift', () => {
    useSimStore.getState().pressButton(6, [{ kind: 'rotate', degrees: 180 }]);
    // 180° at 90°/s = 2 s = 120 ticks; advance 130 to absorb the corrective-velocity
    // final tick that fires at tick 120 (done=false) and completes at tick 121.
    advance(130);

    const afterRotate = useSimStore.getState().robot;
    expect(afterRotate.heading).toBeCloseTo(Math.PI, 9);

    useSimStore.getState().pressButton(1, DRIVE_10);
    advance(120);

    const afterDrive = useSimStore.getState().robot;
    expect(afterDrive.x - afterRotate.x).toBeCloseTo(-0.1, 3);
    expect(afterDrive.y - afterRotate.y).toBeCloseTo(0, 9);
  });
});

describe('sim-store — status reset after natural completion (buttons re-enable)', () => {
  it('status returns to idle after rotation completes naturally', () => {
    useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
    expect(useSimStore.getState().status).toBe('running');

    advance(120);

    expect(useSimStore.getState().status).toBe('idle');
  });

  it('pressButton is accepted again after rotation completes', () => {
    useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
    advance(120);

    expect(useSimStore.getState().status).toBe('idle');

    // Second press must not be blocked — robot should start moving again
    useSimStore.getState().pressButton(1, DRIVE_10);
    expect(useSimStore.getState().status).toBe('running');
  });

  it('status returns to idle after drive completes naturally', () => {
    useSimStore.getState().pressButton(1, DRIVE_10);
    expect(useSimStore.getState().status).toBe('running');

    advance(120);

    expect(useSimStore.getState().status).toBe('idle');
  });
});

describe('sim-store — fast-click guard (no diagonal from mid-rotation interrupt)', () => {
  it('pressButton mid-rotation is ignored: status stays running, robot state unchanged', () => {
    useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
    advance(10);

    const mid = useSimStore.getState().robot;
    expect(mid.heading).toBeGreaterThan(0);
    expect(mid.heading).toBeLessThan(Math.PI / 2);

    // rapid second press while rotating — must be a no-op
    useSimStore.getState().pressButton(1, DRIVE_10);

    const after = useSimStore.getState().robot;
    expect(after.heading).toBe(mid.heading);
    expect(after.vLinear).toBe(mid.vLinear);
    expect(after.vAngular).toBe(mid.vAngular);
    expect(useSimStore.getState().status).toBe('running');
  });

  it('pressButton mid-rotation does not add a new run event', () => {
    useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
    advance(10);
    const eventsBefore = useSimStore.getState().currentRunEvents.length;

    useSimStore.getState().pressButton(1, DRIVE_10);

    expect(useSimStore.getState().currentRunEvents.length).toBe(eventsBefore);
  });

  it('rotation completes, then drive is accepted and travels along cardinal axis', () => {
    useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
    advance(120); // let rotation finish

    const afterRotate = useSimStore.getState().robot;
    expect(afterRotate.heading).toBeCloseTo(Math.PI / 2, 9);

    useSimStore.getState().pressButton(1, DRIVE_10);
    advance(120);

    const afterDrive = useSimStore.getState().robot;
    expect(afterDrive.x - afterRotate.x).toBeCloseTo(0, 9);
    expect(afterDrive.y - afterRotate.y).toBeCloseTo(0.1, 3);
  });

  it('cumulative drift: four +90° turns end at exactly 360° heading', () => {
    const startHeading = useSimStore.getState().robot.heading;
    for (let i = 0; i < 4; i++) {
      useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
      advance(120);
    }
    const finalHeading = useSimStore.getState().robot.heading;
    const totalDegrees = ((finalHeading - startHeading) * 180) / Math.PI;
    expect(totalDegrees).toBeCloseTo(360, 9);
  });

  it('square path: drive-rotate ×4 returns to within 1mm of the start, heading mod 360 = 0', () => {
    const start = { ...useSimStore.getState().robot };
    for (let i = 0; i < 4; i++) {
      useSimStore.getState().pressButton(1, DRIVE_10);
      advance(120);
      useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
      advance(120);
    }
    const end = useSimStore.getState().robot;
    expect(end.x).toBeCloseTo(start.x, 3);
    expect(end.y).toBeCloseTo(start.y, 3);
    const finalDegrees = ((end.heading * 180) / Math.PI) % 360;
    expect(Math.abs(finalDegrees) % 360).toBeCloseTo(0, 6);
  });
});

describe('sim-store — grade-aware heading snap', () => {
  afterEach(() => {
    useGradeStore.getState().setGrade('grade4');
  });

  it('grade5: rotate 45° ends at exactly π/4 and a drive then moves diagonally', () => {
    useGradeStore.getState().setGrade('grade5');
    useSimStore.getState().pressButton(7, [{ kind: 'rotate', degrees: 45 }]);
    advance(120);

    const afterRotate = useSimStore.getState().robot;
    expect(afterRotate.heading).toBeCloseTo(Math.PI / 4, 9);

    useSimStore.getState().pressButton(1, DRIVE_10);
    advance(120);

    const afterDrive = useSimStore.getState().robot;
    expect(afterDrive.x - afterRotate.x).toBeCloseTo(0.1 * Math.SQRT1_2, 3);
    expect(afterDrive.y - afterRotate.y).toBeCloseTo(0.1 * Math.SQRT1_2, 3);
  });

  it('grade5: a slightly-off 46° turn snaps to the 45° increment', () => {
    useGradeStore.getState().setGrade('grade5');
    useSimStore.getState().pressButton(7, [{ kind: 'rotate', degrees: 46 }]);
    advance(120);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI / 4, 9);
  });

  it('grade5: rotate 90° still snaps to exactly π/2 (90 is a 45° multiple)', () => {
    useGradeStore.getState().setGrade('grade5');
    useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
    advance(120);
    expect(useSimStore.getState().robot.heading).toBeCloseTo(Math.PI / 2, 9);
  });

  it('grade4: a 46° turn does NOT snap to 45 — rounds to the whole degree 46', () => {
    useSimStore.getState().pressButton(7, [{ kind: 'rotate', degrees: 46 }]);
    advance(120);
    expect(useSimStore.getState().robot.heading).toBeCloseTo((46 * Math.PI) / 180, 9);
  });

  it('grade79: no coarse snap — a 92° turn stays at 92°, not 90°', () => {
    useGradeStore.getState().setGrade('grade79');
    useSimStore.getState().pressButton(2, [{ kind: 'rotate', degrees: 92 }]);
    advance(140);
    expect(useSimStore.getState().robot.heading).toBeCloseTo((92 * Math.PI) / 180, 9);
  });
});
