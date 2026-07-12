import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-react';
import App from '../../src/App';
import { storeBridge } from './helpers/store-bridge';
import { useGradeStore } from '../../src/store/grade-store';
import type { Step } from '../../src/sim/behaviors/schema';

describe('grade selector: end-to-end', () => {
  beforeEach(async () => {
    await storeBridge.resetAll();
    useGradeStore.getState().setGrade('grade4');
    render(<App />);
  });

  afterEach(() => {
    useGradeStore.getState().setGrade('grade4');
  });

  it('switching to grades 7-9 hides the 🎲 button and offers the track boards', async () => {
    await page.getByRole('button', { name: 'Grades 7-9' }).click();
    await page.getByRole('tab', { name: /boards/i }).click();

    await expect.element(page.getByText(/careful driving/i)).toBeVisible();
    await expect.element(page.getByText(/racing/i)).toBeVisible();
    expect(page.getByRole('button', { name: /random board/i }).query()).toBeNull();
    // Grade-4 grid boards are not offered in this tier.
    expect(page.getByText(/maze/i).query()).toBeNull();
  });

  it('grade 5 offers the diagonal board and keeps the 🎲 button', async () => {
    await page.getByRole('button', { name: 'Grade 5' }).click();
    await page.getByRole('tab', { name: /boards/i }).click();

    await expect.element(page.getByText(/diagonal/i)).toBeVisible();
    await expect.element(page.getByRole('button', { name: /random board/i })).toBeVisible();
  });

  it('a program built in grade 4 survives a round-trip through grades 7-9', async () => {
    const program: Step[] = [
      { kind: 'drive', cm: 25 },
      { kind: 'rotate', degrees: 90 },
    ];
    storeBridge.editorStore().setBehavior(2, program);

    await page.getByRole('button', { name: 'Grades 7-9' }).click();
    await page.getByRole('button', { name: 'Grade 4' }).click();

    expect(storeBridge.editorStore().programs[2]).toEqual(program);
  });

  it('Load Sample in grade 5 fills all eight press slots (45° turns on 7 and 8)', async () => {
    await page.getByRole('button', { name: 'Grade 5' }).click();
    await page.getByRole('tab', { name: /edit behaviors/i }).click();

    const loadButtons = page.getByRole('button', { name: /load sample program/i });
    await loadButtons.first().click();

    const programs = storeBridge.editorStore().programs;
    expect(programs[7]).toEqual([{ kind: 'rotate', degrees: 45 }]);
    expect(programs[8]).toEqual([{ kind: 'rotate', degrees: -45 }]);
  });

  it('the selection persists in localStorage under the versioned key', async () => {
    await page.getByRole('button', { name: 'Grade 5' }).click();
    expect(localStorage.getItem('scribbler-sim:grade:v1')).toBe('grade5');
  });
});
