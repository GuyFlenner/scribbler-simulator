import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GRADE_STORAGE_KEY } from './grade-store';

describe('grade-store — hydration and persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('defaults to grade4 when nothing is stored', async () => {
    const mod = await import('./grade-store');
    expect(mod.useGradeStore.getState().grade).toBe('grade4');
  });

  it('persists the selection and hydrates it on the next load', async () => {
    const mod = await import('./grade-store');
    mod.useGradeStore.getState().setGrade('grade5');
    expect(localStorage.getItem(GRADE_STORAGE_KEY)).toBe('grade5');

    vi.resetModules();
    const fresh = await import('./grade-store');
    expect(fresh.useGradeStore.getState().grade).toBe('grade5');
  });

  it('falls back to grade4 when localStorage holds garbage', async () => {
    localStorage.setItem(GRADE_STORAGE_KEY, 'grade99');
    const mod = await import('./grade-store');
    expect(mod.useGradeStore.getState().grade).toBe('grade4');
  });

  it('uses the versioned scribbler-sim key convention', () => {
    expect(GRADE_STORAGE_KEY).toBe('scribbler-sim:grade:v1');
  });
});
