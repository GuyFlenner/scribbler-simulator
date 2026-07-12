import { describe, it, expect } from 'vitest';
import {
  DEFAULT_GRADE,
  GRADES,
  GRADE_CONFIGS,
  getGradeConfig,
  isGrade,
  stepKindsOutsideGrade,
} from './config';
import { classProgramSample } from '../sim/behaviors/starter';
import type { Step } from '../sim/behaviors/schema';

const blockTypesOf = (grade: (typeof GRADES)[number]): string[] =>
  getGradeConfig(grade).toolbox.flatMap((c) => c.blocks.map((b) => b.type));

describe('grade config — structure', () => {
  it('defines exactly the three Robotraffic tiers with matching ids', () => {
    expect(GRADES).toEqual(['grade4', 'grade5', 'grade79']);
    for (const g of GRADES) {
      expect(GRADE_CONFIGS[g].id).toBe(g);
    }
  });

  it('default grade is grade4 (the original behavior)', () => {
    expect(DEFAULT_GRADE).toBe('grade4');
  });

  it('snap increments: 90° for grade4, 45° for grade5, whole-degree only for grade79', () => {
    expect(getGradeConfig('grade4').snapIncrementDeg).toBe(90);
    expect(getGradeConfig('grade5').snapIncrementDeg).toBe(45);
    expect(getGradeConfig('grade79').snapIncrementDeg).toBeNull();
  });

  it('random board: 4-connected in grade4, 8-connected in grade5, hidden in grade79', () => {
    expect(getGradeConfig('grade4').randomBoard).toEqual({ connectivity: 4 });
    expect(getGradeConfig('grade5').randomBoard).toEqual({ connectivity: 8 });
    expect(getGradeConfig('grade79').randomBoard).toBeNull();
  });

  it('every grade lists its default board among its bundled boards', () => {
    for (const g of GRADES) {
      const cfg = getGradeConfig(g);
      expect(cfg.bundledBoardIds).toContain(cfg.defaultBoardId);
    }
  });

  it('starter press counts are within the 1..8 slot range and non-empty', () => {
    for (const g of GRADES) {
      for (const entry of getGradeConfig(g).starterProgram) {
        expect(entry.pressCount).toBeGreaterThanOrEqual(1);
        expect(entry.pressCount).toBeLessThanOrEqual(8);
        expect(entry.steps.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('grade config — toolbox contents (regression locks)', () => {
  it('grade4 toolbox is the original set minus the advanced motor blocks', () => {
    expect(blockTypesOf('grade4')).toEqual([
      'drive_distance',
      'rotate_degrees',
      'stop',
      'beep',
      'wait',
      'repeat',
      'while_sensor',
      'while_not_sensor',
      'if_sensor',
    ]);
  });

  it('grade5 adds a preset 45° rotate entry and nothing else', () => {
    const entries = getGradeConfig('grade5').toolbox.flatMap((c) => c.blocks);
    const preset = entries.find((b) => b.fields?.DEGREES === 45);
    expect(preset?.type).toBe('rotate_degrees');
    expect(blockTypesOf('grade5').filter((t) => t === 'rotate_degrees')).toHaveLength(2);
    expect(blockTypesOf('grade5')).not.toContain('drive_wheels');
    expect(blockTypesOf('grade5')).not.toContain('drive_arc');
  });

  it('grade79 exposes the motor-level blocks first in Motion', () => {
    const types = blockTypesOf('grade79');
    expect(types).toContain('drive_wheels');
    expect(types).toContain('drive_arc');
    expect(types.indexOf('drive_wheels')).toBeLessThan(types.indexOf('drive_distance'));
  });

  it('grade4 starter is exactly the confirmed competition layout', () => {
    expect(getGradeConfig('grade4').starterProgram).toBe(classProgramSample);
  });

  it('grade5 starter extends the grade4 layout with ±45° on presses 7 and 8', () => {
    const starter = getGradeConfig('grade5').starterProgram;
    expect(starter.slice(0, classProgramSample.length)).toEqual(classProgramSample);
    expect(starter.find((e) => e.pressCount === 7)?.steps).toEqual([
      { kind: 'rotate', degrees: 45 },
    ]);
    expect(starter.find((e) => e.pressCount === 8)?.steps).toEqual([
      { kind: 'rotate', degrees: -45 },
    ]);
  });
});

describe('isGrade', () => {
  it('accepts exactly the known grades', () => {
    expect(isGrade('grade4')).toBe(true);
    expect(isGrade('grade5')).toBe(true);
    expect(isGrade('grade79')).toBe(true);
  });

  it('rejects unknown strings and non-strings', () => {
    expect(isGrade('grade6')).toBe(false);
    expect(isGrade('')).toBe(false);
    expect(isGrade(null)).toBe(false);
    expect(isGrade(undefined)).toBe(false);
    expect(isGrade(4)).toBe(false);
  });
});

describe('stepKindsOutsideGrade', () => {
  const grade4 = getGradeConfig('grade4');
  const grade79 = getGradeConfig('grade79');

  it('returns empty for the grade4 starter in grade4', () => {
    for (const entry of classProgramSample) {
      expect(stepKindsOutsideGrade(entry.steps, grade4)).toEqual([]);
    }
  });

  it('flags drive_wheels used in grade4 (hidden there)', () => {
    const steps: Step[] = [
      { kind: 'drive_wheels', leftSpeedPct: 50, rightSpeedPct: -50, durationMs: 500 },
    ];
    expect(stepKindsOutsideGrade(steps, grade4)).toEqual(['drive_wheels']);
  });

  it('finds hidden blocks nested inside repeat/if bodies', () => {
    const steps: Step[] = [
      {
        kind: 'repeat',
        times: 2,
        body: [
          {
            kind: 'if',
            condition: { kind: 'line_left' },
            then: [{ kind: 'drive', cm: 5 }],
            else: [{ kind: 'drive_arc', radiusCm: 10, degrees: 90 }],
          },
        ],
      },
    ];
    expect(stepKindsOutsideGrade(steps, grade4)).toEqual(['drive_arc']);
  });

  it('while with a negated predicate maps to while_not_sensor (available everywhere)', () => {
    const steps: Step[] = [
      {
        kind: 'while',
        condition: { kind: 'not', inner: { kind: 'line_left' } },
        body: [{ kind: 'drive', cm: 1 }],
        maxIterations: 100,
      },
    ];
    expect(stepKindsOutsideGrade(steps, grade4)).toEqual([]);
  });

  it('returns empty for motor blocks in grade79 where they are offered', () => {
    const steps: Step[] = [
      { kind: 'drive_wheels', leftSpeedPct: 50, rightSpeedPct: 50, durationMs: 500 },
      { kind: 'drive_arc', radiusCm: 20, degrees: 45 },
    ];
    expect(stepKindsOutsideGrade(steps, grade79)).toEqual([]);
  });
});
