import { describe, it, expect, beforeEach } from 'vitest';
import { useSimStore } from './sim-store';
import { useBoardsStore } from './boards-store';
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
    expect(afterDrive.y - afterRotate.y).toBeCloseTo(0.10, 3);
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
    expect(afterDrive.x - afterRotate.x).toBeCloseTo(-0.10, 3);
    expect(afterDrive.y - afterRotate.y).toBeCloseTo(0, 9);
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
    expect(afterDrive.y - afterRotate.y).toBeCloseTo(0.10, 3);
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
