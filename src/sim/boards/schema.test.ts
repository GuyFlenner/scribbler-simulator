import { describe, it, expect } from 'vitest';
import { parseBoard } from './schema';

describe('parseBoard — security', () => {
  it('rejects boards with non-numeric coordinates', () => {
    const malformed = JSON.stringify({
      version: 1,
      id: 'evil',
      name: 'x',
      width: 1,
      height: 1,
      elements: [{ kind: 'obstacle', x: '<script>', y: 0, w: 1, h: 1 }],
    });
    expect(() => parseBoard(malformed)).toThrow(/invalid|numeric|number/i);
  });

  it('rejects malformed JSON', () => {
    expect(() => parseBoard('{not json')).toThrow();
  });

  it('rejects an unknown element kind', () => {
    const malformed = JSON.stringify({
      version: 1,
      id: 'a',
      name: 'a',
      width: 1,
      height: 1,
      elements: [{ kind: 'meteor', x: 0, y: 0 }],
    });
    expect(() => parseBoard(malformed)).toThrow(/unknown|invalid/i);
  });

  it('rejects boards with an unsupported version', () => {
    const future = JSON.stringify({
      version: 99,
      id: 'a',
      name: 'a',
      width: 1,
      height: 1,
      elements: [],
    });
    expect(() => parseBoard(future)).toThrow(/version/i);
  });

  it('accepts a valid board', () => {
    const valid = JSON.stringify({
      version: 1,
      id: 'a',
      name: 'A',
      width: 1,
      height: 1,
      elements: [
        { kind: 'start', x: 0, y: 0, heading: 0 },
        { kind: 'goal', x: 1, y: 1, toleranceCm: 5 },
        { kind: 'obstacle', x: 0.5, y: 0.5, w: 0.1, h: 0.1 },
      ],
    });
    const board = parseBoard(valid);
    expect(board.id).toBe('a');
    expect(board.elements).toHaveLength(3);
  });

  it('accepts a bonus zone element', () => {
    const valid = JSON.stringify({
      version: 1,
      id: 'b',
      name: 'with bonus',
      width: 1,
      height: 1,
      elements: [
        { kind: 'start', x: 0, y: 0, heading: 0 },
        { kind: 'goal', x: 1, y: 1, toleranceCm: 5 },
        { kind: 'bonus', x: 0.5, y: 0.5, toleranceCm: 8 },
      ],
    });
    const board = parseBoard(valid);
    const bonus = board.elements.find((e) => e.kind === 'bonus');
    expect(bonus).toBeDefined();
    if (bonus && bonus.kind === 'bonus') {
      expect(bonus.x).toBe(0.5);
      expect(bonus.toleranceCm).toBe(8);
    }
  });

  it('rejects a bonus zone with non-numeric coords', () => {
    const malformed = JSON.stringify({
      version: 1,
      id: 'b',
      name: 'bad',
      width: 1,
      height: 1,
      elements: [{ kind: 'bonus', x: 'middle', y: 0.5, toleranceCm: 8 }],
    });
    expect(() => parseBoard(malformed)).toThrow(/numeric|number/i);
  });
});
