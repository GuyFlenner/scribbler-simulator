import { describe, it, expect } from 'vitest';
import en from './en.json';
import he from './he.json';
import { deepKeys } from './deep-keys';

describe('i18n parity', () => {
  it('every he.json key exists in en.json and vice versa', () => {
    const enKeys = deepKeys(en).sort();
    const heKeys = deepKeys(he).sort();
    expect(heKeys).toEqual(enKeys);
  });

  it('no leaf value is empty', () => {
    for (const json of [en, he] as const) {
      const stack: Array<{ obj: unknown; path: string }> = [{ obj: json, path: '' }];
      while (stack.length > 0) {
        const { obj, path } = stack.pop()!;
        if (typeof obj === 'string') {
          expect(obj.length, `${path} must be non-empty`).toBeGreaterThan(0);
        } else if (obj && typeof obj === 'object') {
          for (const [k, v] of Object.entries(obj)) {
            stack.push({ obj: v, path: path ? `${path}.${k}` : k });
          }
        }
      }
    }
  });
});
