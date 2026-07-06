import { describe, it, expect, beforeEach } from 'vitest';
import { validateProgram, loadProgram, saveProgram, STORAGE_KEY } from './persistence';
import type { Program } from '../sim/behaviors/schema';

beforeEach(() => {
  localStorage.clear();
});

describe('validateProgram — accepts valid', () => {
  it('parses a minimal valid program', () => {
    const valid = {
      version: 1,
      behaviors: [{ pressCount: 2, label: 'Forward', steps: [{ kind: 'drive', cm: 30 }] }],
    };
    const program = validateProgram(valid);
    expect(program.behaviors).toHaveLength(1);
    expect(program.behaviors[0].steps[0]).toEqual({ kind: 'drive', cm: 30 });
  });

  it('parses a nested repeat with body', () => {
    const valid = {
      version: 1,
      behaviors: [
        {
          pressCount: 3,
          label: 'Square',
          steps: [{ kind: 'repeat', times: 4, body: [{ kind: 'drive', cm: 10 }] }],
        },
      ],
    };
    const program = validateProgram(valid);
    const step = program.behaviors[0].steps[0];
    expect(step.kind).toBe('repeat');
    if (step.kind === 'repeat') {
      expect(step.body).toEqual([{ kind: 'drive', cm: 10 }]);
    }
  });
});

describe('validateProgram — rejects malformed (security)', () => {
  it('throws on non-object', () => {
    expect(() => validateProgram('hello')).toThrow();
    expect(() => validateProgram(42)).toThrow();
    expect(() => validateProgram(null)).toThrow();
  });

  it('throws on unsupported version', () => {
    expect(() => validateProgram({ version: 99, behaviors: [] })).toThrow(/version/i);
  });

  it('throws on non-array behaviors', () => {
    expect(() => validateProgram({ version: 1, behaviors: 'oops' })).toThrow(/behaviors/i);
  });

  it('throws when a step has an unknown kind (script-injection style)', () => {
    const evil = {
      version: 1,
      behaviors: [
        {
          pressCount: 2,
          label: 'evil',
          steps: [{ kind: 'eval_js', code: 'alert(1)' }],
        },
      ],
    };
    expect(() => validateProgram(evil)).toThrow(/unknown|kind|step/i);
  });

  it('throws when a numeric field carries a string value', () => {
    const evil = {
      version: 1,
      behaviors: [
        {
          pressCount: 2,
          label: 'evil',
          steps: [{ kind: 'drive', cm: '<script>' }],
        },
      ],
    };
    expect(() => validateProgram(evil)).toThrow(/numeric|number|cm/i);
  });
});

describe('loadProgram / saveProgram', () => {
  it('round-trips a program through localStorage', () => {
    const program: Program = {
      version: 1,
      behaviors: [{ pressCount: 2, label: 'Hop', steps: [{ kind: 'drive', cm: 5 }] }],
    };
    saveProgram(program);
    const loaded = loadProgram();
    expect(loaded).toEqual(program);
  });

  it('returns null when localStorage is empty', () => {
    expect(loadProgram()).toBeNull();
  });

  it('returns null on malformed JSON in storage (defensive — no crash)', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadProgram()).toBeNull();
  });

  it('returns null when stored program fails schema validation', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadProgram()).toBeNull();
  });
});
