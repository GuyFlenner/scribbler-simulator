import { describe, it, expect, beforeEach } from 'vitest';
import { useSimStore } from './sim-store';
import { useBoardsStore } from './boards-store';
import type { BoardState } from '../sim/boards/schema';
import type { Step } from '../sim/behaviors/schema';

const ROTATE_RIGHT_90: Step[] = [{ kind: 'rotate', degrees: 90 }];
const ROTATE_LEFT_90: Step[] = [{ kind: 'rotate', degrees: -90 }];
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
    advance(120);

    const afterRotate = useSimStore.getState().robot;
    expect(afterRotate.heading).toBeCloseTo(Math.PI, 9);

    useSimStore.getState().pressButton(1, DRIVE_10);
    advance(120);

    const afterDrive = useSimStore.getState().robot;
    expect(afterDrive.x - afterRotate.x).toBeCloseTo(-0.10, 3);
    expect(afterDrive.y - afterRotate.y).toBeCloseTo(0, 9);
  });
});

describe('sim-store — heading snap on interrupt (the 8yo-QA bug)', () => {
  it('interrupting a rotate mid-flight: heading is snapped to an integer degree before drive', () => {
    useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
    advance(10);

    const mid = useSimStore.getState().robot;
    expect(mid.heading).toBeGreaterThan(0);
    expect(mid.heading).toBeLessThan(Math.PI / 2);

    useSimStore.getState().pressButton(1, DRIVE_10);

    const snapped = useSimStore.getState().robot;
    const degrees = (snapped.heading * 180) / Math.PI;
    expect(degrees).toBeCloseTo(Math.round(degrees), 9);
    expect(snapped.vLinear).toBe(0);
    expect(snapped.vAngular).toBe(0);
  });

  it('interrupting a rotate then driving: trajectory aligned with snapped heading (no diagonal-drift)', () => {
    useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
    advance(10);

    useSimStore.getState().pressButton(1, DRIVE_10);
    const heading = useSimStore.getState().robot.heading;
    const startPos = useSimStore.getState().robot;
    advance(120);

    const endPos = useSimStore.getState().robot;
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const expectedDx = Math.cos(heading) * 0.10;
    const expectedDy = Math.sin(heading) * 0.10;
    expect(dx).toBeCloseTo(expectedDx, 3);
    expect(dy).toBeCloseTo(expectedDy, 3);
  });

  it.each([5, 15, 30, 45])(
    'interrupting rotate after %i ticks: subsequent drive is exactly along the snapped heading',
    (interruptAfter) => {
      useSimStore.getState().pressButton(4, ROTATE_RIGHT_90);
      advance(interruptAfter);

      useSimStore.getState().pressButton(1, DRIVE_10);
      const heading = useSimStore.getState().robot.heading;
      const startPos = useSimStore.getState().robot;
      advance(120);

      const endPos = useSimStore.getState().robot;
      const dx = endPos.x - startPos.x;
      const dy = endPos.y - startPos.y;
      expect(dx).toBeCloseTo(Math.cos(heading) * 0.10, 3);
      expect(dy).toBeCloseTo(Math.sin(heading) * 0.10, 3);
    },
  );

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

  it('interrupt with negative-degree rotate: snap still produces a clean integer degree', () => {
    useSimStore.getState().pressButton(5, ROTATE_LEFT_90);
    advance(10);
    useSimStore.getState().pressButton(1, DRIVE_10);

    const snapped = useSimStore.getState().robot;
    const degrees = (snapped.heading * 180) / Math.PI;
    expect(degrees).toBeCloseTo(Math.round(degrees), 9);
    expect(snapped.vLinear).toBe(0);
    expect(snapped.vAngular).toBe(0);
  });
});
