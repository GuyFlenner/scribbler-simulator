import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSimStore } from '../store/sim-store';
import { useBoardsStore } from '../store/boards-store';
import { useGradeStore } from '../store/grade-store';
import { grade79ProgramSample } from './behaviors/starter';
import { serpentineBoard } from './boards/tracks';
import { distPointToSegment } from './geometry';
import type { LineSegment } from './boards/schema';

/**
 * Grade 7-9 end-to-end validation: the press-4 starter (bang-bang line
 * follower built from drive_wheels + nested if_sensor) must follow the
 * serpentine racing track from start to goal — through both hairpins —
 * without ever leaving a 5cm corridor around the line. Deterministic:
 * fixed 1/60 dt, no RNG.
 */

const track = serpentineBoard.elements.filter((e): e is LineSegment => e.kind === 'line');

const distToTrack = (x: number, y: number): number =>
  Math.min(...track.map((s) => distPointToSegment(x, y, s.x1, s.y1, s.x2, s.y2)));

const followerSteps = grade79ProgramSample.find((e) => e.pressCount === 4)?.steps;

beforeEach(() => {
  localStorage.clear();
  useBoardsStore.getState().resetAll();
  useGradeStore.getState().setGrade('grade79');
  useSimStore.getState().setBoard(serpentineBoard);
});

afterEach(() => {
  useGradeStore.getState().setGrade('grade4');
});

describe('grade 7-9 — line follower on the serpentine track', () => {
  it('follows the line from start to goal, staying within 5cm of the track', () => {
    if (!followerSteps) throw new Error('press-4 follower starter missing');
    useSimStore.getState().pressButton(4, followerSteps);
    expect(useSimStore.getState().status).toBe('running');

    let maxDeviation = 0;
    let travelled = 0;
    let prev = { x: useSimStore.getState().robot.x, y: useSimStore.getState().robot.y };
    const maxTicks = 60 * 90; // 90 simulated seconds — generous for ~2.6m of track
    for (let i = 0; i < maxTicks; i++) {
      useSimStore.getState().tick(1 / 60);
      const { robot, status } = useSimStore.getState();
      maxDeviation = Math.max(maxDeviation, distToTrack(robot.x, robot.y));
      travelled += Math.hypot(robot.x - prev.x, robot.y - prev.y);
      prev = { x: robot.x, y: robot.y };
      expect(status).not.toBe('stalled');
      if (status === 'reached-goal') break;
    }

    expect(useSimStore.getState().status).toBe('reached-goal');
    // Never left the corridor around the 5cm-wide line.
    expect(maxDeviation).toBeLessThan(0.05);
    // Real forward progress through both hairpins, not jitter in place.
    expect(travelled).toBeGreaterThan(1.5);
  });

  it('press 5 (proportional follow_line) also completes the track, in a tighter corridor', () => {
    const proportional = grade79ProgramSample.find((e) => e.pressCount === 5)?.steps;
    if (!proportional) throw new Error('press-5 follow_line starter missing');
    useSimStore.getState().pressButton(5, proportional);

    let maxDeviation = 0;
    const maxTicks = 60 * 90;
    for (let i = 0; i < maxTicks; i++) {
      useSimStore.getState().tick(1 / 60);
      const { robot, status } = useSimStore.getState();
      maxDeviation = Math.max(maxDeviation, distToTrack(robot.x, robot.y));
      expect(status).not.toBe('stalled');
      if (status === 'reached-goal') break;
    }

    expect(useSimStore.getState().status).toBe('reached-goal');
    // Proportional control holds the line noticeably tighter than bang-bang.
    expect(maxDeviation).toBeLessThan(0.04);
  });

  it('tank and pivot starters produce the expected motion primitives', () => {
    // Press 1: tank forward — straight line, no heading change.
    const straight = grade79ProgramSample.find((e) => e.pressCount === 1)?.steps;
    if (!straight) throw new Error('press-1 starter missing');
    const before = { ...useSimStore.getState().robot };
    useSimStore.getState().pressButton(1, straight);
    for (let i = 0; i < 90 && useSimStore.getState().status === 'running'; i++) {
      useSimStore.getState().tick(1 / 60);
    }
    const after = useSimStore.getState().robot;
    expect(after.x).toBeGreaterThan(before.x + 0.05);
    expect(after.heading).toBeCloseTo(before.heading, 6);

    // Press 2 then press 3: opposite pivots cancel out (pure in-place turns).
    useSimStore.getState().resetBoard();
    const pivotL = grade79ProgramSample.find((e) => e.pressCount === 2)?.steps;
    const pivotR = grade79ProgramSample.find((e) => e.pressCount === 3)?.steps;
    if (!pivotL || !pivotR) throw new Error('pivot starters missing');
    const start = { ...useSimStore.getState().robot };
    useSimStore.getState().pressButton(2, pivotL);
    for (let i = 0; i < 60 && useSimStore.getState().status === 'running'; i++) {
      useSimStore.getState().tick(1 / 60);
    }
    const mid = useSimStore.getState().robot;
    expect(mid.x).toBeCloseTo(start.x, 4); // pivot: no translation
    expect(mid.y).toBeCloseTo(start.y, 4);
    expect(mid.heading).not.toBeCloseTo(start.heading, 2);

    useSimStore.getState().pressButton(3, pivotR);
    for (let i = 0; i < 60 && useSimStore.getState().status === 'running'; i++) {
      useSimStore.getState().tick(1 / 60);
    }
    const end = useSimStore.getState().robot;
    expect(end.heading).toBeCloseTo(start.heading, 1); // opposite pivots cancel
  });
});
