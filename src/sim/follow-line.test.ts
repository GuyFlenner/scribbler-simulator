import { describe, it, expect } from 'vitest';
import { readLineReflectivity } from './sensors';
import { makeRobotState } from './physics';
import { startProgram } from './runtime';
import { compileBlocks, stepsToWorkspaceJson, compileBlocklyJson } from '../editor/codegen';
import { validateProgram } from '../editor/persistence';
import type { BoardState } from './boards/schema';

const board = (elements: BoardState['elements']): BoardState => ({
  version: 1,
  id: 'follow-test',
  name: 'follow',
  width: 2,
  height: 2,
  elements,
});

// A wide (5cm, competition-width) horizontal line through y=1.0.
const WIDE_LINE = board([{ kind: 'line', x1: 0, y1: 1.0, x2: 2, y2: 1.0, thickness: 0.05 }]);

describe('readLineReflectivity — analog 0-100 (real S3 semantics)', () => {
  it('reads 100 when a sensor is fully over the line', () => {
    // Thin 2cm line directly under the left sensor point (+3cm lateral).
    const b = board([{ kind: 'line', x1: 0, y1: 1.03, x2: 2, y2: 1.03, thickness: 0.02 }]);
    const robot = makeRobotState({ x: 1.0, y: 1.0, heading: 0 });
    const r = readLineReflectivity(robot, b);
    expect(r.left).toBe(100);
    expect(r.right).toBe(0);
  });

  it('centered on a 5cm line, both sensors read a symmetric partial value', () => {
    const robot = makeRobotState({ x: 1.0, y: 1.0, heading: 0 });
    const r = readLineReflectivity(robot, WIDE_LINE);
    expect(r.left).toBeCloseTo(25, 6);
    expect(r.right).toBeCloseTo(25, 6);
  });

  it('drifting off-centre produces an asymmetric signal pointing back at the line', () => {
    // Robot drifted +1cm (+y): the line is now on the robot's -y side, so the
    // right sensor (at -y) must read higher than the left.
    const robot = makeRobotState({ x: 1.0, y: 1.01, heading: 0 });
    const r = readLineReflectivity(robot, WIDE_LINE);
    expect(r.right).toBeCloseTo(75, 6);
    expect(r.left).toBe(0);
  });

  it('reads 0/0 when fully off the line', () => {
    const robot = makeRobotState({ x: 1.0, y: 1.5, heading: 0 });
    const r = readLineReflectivity(robot, WIDE_LINE);
    expect(r.left).toBe(0);
    expect(r.right).toBe(0);
  });
});

describe('follow_line — block/step plumbing', () => {
  it('compiles the Blockly block to the step and round-trips back', () => {
    const steps = compileBlocks([{ type: 'follow_line', fields: { SPEED: 45, SECONDS: 20 } }]);
    expect(steps).toEqual([{ kind: 'follow_line', speedPct: 45, seconds: 20 }]);

    const json = stepsToWorkspaceJson(steps);
    expect(compileBlocklyJson(json)).toEqual(steps);
  });

  it('validates through program persistence and rejects non-numeric fields', () => {
    const good = {
      version: 1,
      behaviors: [
        {
          pressCount: 5,
          label: 'p5',
          steps: [{ kind: 'follow_line', speedPct: 60, seconds: 60 }],
        },
      ],
    };
    expect(() => validateProgram(good)).not.toThrow();

    const bad = {
      version: 1,
      behaviors: [
        { pressCount: 5, label: 'p5', steps: [{ kind: 'follow_line', speedPct: 'fast' }] },
      ],
    };
    expect(() => validateProgram(bad)).toThrow(/follow_line/);
  });

  it('stops itself when the line is lost instead of wandering forever', () => {
    // Robot far from any line: the follower should give up after the lost
    // timeout, well before its 30 programmed seconds.
    const b = WIDE_LINE;
    let robot = makeRobotState({ x: 1.0, y: 0.2, heading: 0 });
    const h = startProgram([{ kind: 'follow_line', speedPct: 60, seconds: 30 }]);
    let ticks = 0;
    for (; ticks < 30 * 60; ticks++) {
      const { vLinear, vAngular, done } = h.step(robot, 1 / 60, b);
      if (done) break;
      robot = {
        ...robot,
        x: robot.x + vLinear * Math.cos(robot.heading) * (1 / 60),
        y: robot.y + vLinear * Math.sin(robot.heading) * (1 / 60),
        heading: robot.heading + vAngular * (1 / 60),
      };
    }
    expect(ticks).toBeLessThan(2 * 60); // gave up within ~the 1s timeout
    expect(robot.x - 1.0).toBeLessThan(0.2); // travelled less than 20cm blind
  });
});
