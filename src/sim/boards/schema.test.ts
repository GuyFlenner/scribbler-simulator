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

  it('accepts wall and corner elements (grade-5 geometry)', () => {
    const valid = JSON.stringify({
      version: 1,
      id: 'g5',
      name: 'diag',
      width: 1,
      height: 1,
      elements: [
        { kind: 'wall', x1: 0.3, y1: 0.7, x2: 0.7, y2: 0.3, thickness: 0.02, style: 'dashed' },
        { kind: 'wall', x1: 0, y1: 0, x2: 0.5, y2: 0, thickness: 0.02 },
        { kind: 'corner', corner: 'ne', size: 0.2 },
      ],
    });
    const board = parseBoard(valid);
    expect(board.elements).toHaveLength(3);
    const corner = board.elements.find((e) => e.kind === 'corner');
    if (corner && corner.kind === 'corner') {
      expect(corner.corner).toBe('ne');
      expect(corner.size).toBe(0.2);
    } else {
      throw new Error('corner element missing');
    }
  });

  it('rejects a wall with an invalid style', () => {
    const malformed = JSON.stringify({
      version: 1,
      id: 'w',
      name: 'bad wall',
      width: 1,
      height: 1,
      elements: [{ kind: 'wall', x1: 0, y1: 0, x2: 1, y2: 1, thickness: 0.02, style: 'zigzag' }],
    });
    expect(() => parseBoard(malformed)).toThrow(/style/i);
  });

  it('rejects a corner with an invalid position or non-positive size', () => {
    const badCorner = JSON.stringify({
      version: 1,
      id: 'c',
      name: 'bad corner',
      width: 1,
      height: 1,
      elements: [{ kind: 'corner', corner: 'middle', size: 0.2 }],
    });
    expect(() => parseBoard(badCorner)).toThrow(/corner/i);

    const badSize = JSON.stringify({
      version: 1,
      id: 'c2',
      name: 'bad size',
      width: 1,
      height: 1,
      elements: [{ kind: 'corner', corner: 'nw', size: 0 }],
    });
    expect(() => parseBoard(badSize)).toThrow(/size/i);
  });
});
