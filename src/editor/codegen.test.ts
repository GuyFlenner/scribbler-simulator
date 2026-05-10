import { describe, it, expect } from 'vitest';
import { compileBlocklyJson, compileBlocks, stepsToWorkspaceJson, type BlocklyBlock } from './codegen';
import type { Step } from '../sim/behaviors/schema';

describe('codegen — single blocks', () => {
  it('compiles drive_distance to a drive Step', () => {
    const block: BlocklyBlock = { type: 'drive_distance', fields: { CM: 30 } };
    expect(compileBlocks([block])).toEqual([{ kind: 'drive', cm: 30 }]);
  });

  it('compiles rotate_degrees to a rotate Step', () => {
    const block: BlocklyBlock = { type: 'rotate_degrees', fields: { DEGREES: -90 } };
    expect(compileBlocks([block])).toEqual([{ kind: 'rotate', degrees: -90 }]);
  });

  it('compiles drive_wheels to a drive_wheels Step', () => {
    const block: BlocklyBlock = {
      type: 'drive_wheels',
      fields: { LEFT: 50, RIGHT: -50, DURATION_MS: 1500 },
    };
    expect(compileBlocks([block])).toEqual([
      { kind: 'drive_wheels', leftSpeedPct: 50, rightSpeedPct: -50, durationMs: 1500 },
    ]);
  });

  it('compiles drive_arc to a drive_arc Step', () => {
    const block: BlocklyBlock = {
      type: 'drive_arc',
      fields: { RADIUS_CM: 25, DEGREES: 45 },
    };
    expect(compileBlocks([block])).toEqual([
      { kind: 'drive_arc', radiusCm: 25, degrees: 45 },
    ]);
  });

  it('compiles stop to a stop Step', () => {
    expect(compileBlocks([{ type: 'stop' }])).toEqual([{ kind: 'stop' }]);
  });

  it('compiles beep with default duration when DURATION_MS is missing', () => {
    expect(compileBlocks([{ type: 'beep' }])).toEqual([{ kind: 'beep', durationMs: 200 }]);
  });

  it('compiles wait to a wait Step', () => {
    const block: BlocklyBlock = { type: 'wait', fields: { SECONDS: 2 } };
    expect(compileBlocks([block])).toEqual([{ kind: 'wait', seconds: 2 }]);
  });
});

describe('codegen — chains via next', () => {
  it('flattens a chain of drive then rotate', () => {
    const block: BlocklyBlock = {
      type: 'drive_distance',
      fields: { CM: 10 },
      next: { block: { type: 'rotate_degrees', fields: { DEGREES: 45 } } },
    };
    expect(compileBlocks([block])).toEqual([
      { kind: 'drive', cm: 10 },
      { kind: 'rotate', degrees: 45 },
    ]);
  });
});

describe('codegen — repeat block', () => {
  it('compiles a repeat with body containing a drive', () => {
    const block: BlocklyBlock = {
      type: 'repeat',
      fields: { TIMES: 3 },
      inputs: {
        DO: { block: { type: 'drive_distance', fields: { CM: 5 } } },
      },
    };
    expect(compileBlocks([block])).toEqual([
      { kind: 'repeat', times: 3, body: [{ kind: 'drive', cm: 5 }] },
    ]);
  });
});

describe('codegen — sensor blocks (predicates)', () => {
  it('compiles if_sensor_then with line_left and a body', () => {
    const block: BlocklyBlock = {
      type: 'if_sensor',
      fields: { SENSOR: 'line_left' },
      inputs: {
        DO: { block: { type: 'drive_distance', fields: { CM: 5 } } },
      },
    };
    expect(compileBlocks([block])).toEqual([
      {
        kind: 'if',
        condition: { kind: 'line_left' },
        then: [{ kind: 'drive', cm: 5 }],
      },
    ]);
  });

  it('compiles while_sensor with NOT obstacle_left', () => {
    const block: BlocklyBlock = {
      type: 'while_not_sensor',
      fields: { SENSOR: 'obstacle_left' },
      inputs: {
        DO: { block: { type: 'drive_distance', fields: { CM: 1 } } },
      },
    };
    expect(compileBlocks([block])).toEqual([
      {
        kind: 'while',
        condition: { kind: 'not', inner: { kind: 'obstacle_left' } },
        body: [{ kind: 'drive', cm: 1 }],
        maxIterations: 10000,
      },
    ]);
  });
});

describe('codegen — reverse (Step[] → Blockly JSON)', () => {
  const roundTrip = (steps: Step[]): Step[] => compileBlocklyJson(stepsToWorkspaceJson(steps));

  it('round-trips a single drive_wheels step', () => {
    const steps: Step[] = [
      { kind: 'drive_wheels', leftSpeedPct: 100, rightSpeedPct: -100, durationMs: 2000 },
    ];
    expect(roundTrip(steps)).toEqual(steps);
  });

  it('round-trips a chain of mixed steps', () => {
    const steps: Step[] = [
      { kind: 'drive', cm: 30 },
      { kind: 'rotate', degrees: 90 },
      { kind: 'drive_wheels', leftSpeedPct: 100, rightSpeedPct: 100, durationMs: 1000 },
      { kind: 'wait', seconds: 2 },
      { kind: 'beep', durationMs: 200 },
      { kind: 'stop' },
    ];
    expect(roundTrip(steps)).toEqual(steps);
  });

  it('round-trips a repeat with body', () => {
    const steps: Step[] = [
      {
        kind: 'repeat',
        times: 3,
        body: [{ kind: 'drive_wheels', leftSpeedPct: 100, rightSpeedPct: 100, durationMs: 500 }],
      },
    ];
    expect(roundTrip(steps)).toEqual(steps);
  });

  it('renders a non-empty workspace JSON for non-empty steps', () => {
    const ws = stepsToWorkspaceJson([{ kind: 'drive', cm: 10 }]);
    expect(ws.blocks?.blocks?.length).toBe(1);
    expect(ws.blocks?.blocks?.[0]?.type).toBe('drive_distance');
  });

  it('renders an empty blocks array for empty steps', () => {
    const ws = stepsToWorkspaceJson([]);
    expect(ws.blocks?.blocks).toEqual([]);
  });
});

describe('codegen — workspace serialization', () => {
  it('compiles multiple top-level blocks in order', () => {
    const ws = {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'drive_distance', fields: { CM: 10 } },
          { type: 'stop' },
        ],
      },
    };
    expect(compileBlocklyJson(ws)).toEqual([
      { kind: 'drive', cm: 10 },
      { kind: 'stop' },
    ]);
  });

  it('returns an empty array for an empty workspace', () => {
    expect(compileBlocklyJson({ blocks: { languageVersion: 0, blocks: [] } })).toEqual([]);
  });

  it('returns an empty array for null/undefined input', () => {
    expect(compileBlocklyJson(null)).toEqual([]);
    expect(compileBlocklyJson(undefined)).toEqual([]);
  });

  it('skips unknown block types instead of throwing', () => {
    const ws = {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'mystery_block', fields: { X: 1 } },
          { type: 'stop' },
        ],
      },
    };
    expect(compileBlocklyJson(ws)).toEqual([{ kind: 'stop' }]);
  });
});
