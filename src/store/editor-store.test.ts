import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEY, loadProgram } from '../editor/persistence';
import { classProgramSample } from '../sim/behaviors/starter';

describe('editor-store — default hint setup on first load', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('seeds programs with the competition layout when no prior state exists', async () => {
    const mod = await import('./editor-store');
    const state = mod.useEditorStore.getState();
    for (const entry of classProgramSample) {
      expect(state.programs[entry.pressCount]).toEqual(entry.steps);
    }
    // Also persisted so a page reload keeps the seed.
    const persisted = loadProgram();
    expect(persisted).not.toBeNull();
    expect(persisted?.behaviors.length).toBe(classProgramSample.length);
  });

  it('does NOT re-seed when localStorage already has a program', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        behaviors: [{ pressCount: 1, label: 'custom', steps: [{ kind: 'drive', cm: 5 }] }],
      }),
    );
    const mod = await import('./editor-store');
    const state = mod.useEditorStore.getState();
    expect(state.programs[1]).toEqual([{ kind: 'drive', cm: 5 }]);
    expect(state.programs[2]).toBeUndefined();
  });

  it('seeds workspaceJsonByPressCount so Blockly renders blocks on first load', async () => {
    const mod = await import('./editor-store');
    const state = mod.useEditorStore.getState();
    for (const entry of classProgramSample) {
      expect(state.workspaceJsonByPressCount[entry.pressCount]).toBeDefined();
    }
  });
});
