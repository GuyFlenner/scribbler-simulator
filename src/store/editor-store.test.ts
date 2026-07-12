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

describe('editor-store — loadStarter (grade-aware auto-fill)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('replaces ALL slots: stale programs on unlisted press counts are cleared', async () => {
    const mod = await import('./editor-store');
    const store = mod.useEditorStore.getState();
    store.setBehavior(7, [{ kind: 'beep', durationMs: 100 }]);
    expect(mod.useEditorStore.getState().programs[7]).toBeDefined();

    mod.useEditorStore.getState().loadStarter(classProgramSample);

    const state = mod.useEditorStore.getState();
    for (const entry of classProgramSample) {
      expect(state.programs[entry.pressCount]).toEqual(entry.steps);
      expect(state.workspaceJsonByPressCount[entry.pressCount]).toBeDefined();
    }
    expect(state.programs[7]).toBeUndefined();
    expect(state.workspaceJsonByPressCount[7]).toBeUndefined();
  });

  it('bumps externalRevision so the open Blockly workspace remounts', async () => {
    const mod = await import('./editor-store');
    const before = mod.useEditorStore.getState().externalRevision;
    mod.useEditorStore.getState().loadStarter(classProgramSample);
    expect(mod.useEditorStore.getState().externalRevision).toBe(before + 1);
  });

  it('resetAll also bumps externalRevision', async () => {
    const mod = await import('./editor-store');
    const before = mod.useEditorStore.getState().externalRevision;
    mod.useEditorStore.getState().resetAll();
    expect(mod.useEditorStore.getState().externalRevision).toBe(before + 1);
  });

  it('setBehavior (the Blockly change-handler path) must NOT bump externalRevision', async () => {
    // A bump here would remount the workspace on every drag — the exact
    // remount-loop regression the revision counter is designed to avoid.
    const mod = await import('./editor-store');
    const before = mod.useEditorStore.getState().externalRevision;
    mod.useEditorStore.getState().setBehavior(2, [{ kind: 'drive', cm: 15 }], { blocks: {} });
    expect(mod.useEditorStore.getState().externalRevision).toBe(before);
  });
});

describe('editor-store — workspaceJson persistence (returning users)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('persists workspaceJson alongside steps and restores it verbatim on reload', async () => {
    const mod = await import('./editor-store');
    const markerJson = {
      blocks: { languageVersion: 0, blocks: [{ type: 'drive_distance', x: 123, y: 456 }] },
    };
    mod.useEditorStore.getState().loadStarter([]);
    mod.useEditorStore.getState().setBehavior(3, [{ kind: 'drive', cm: 40 }], markerJson);

    vi.resetModules();
    const fresh = await import('./editor-store');
    // The exact workspace (incl. the 123/456 block position, which lossy
    // reverse-codegen cannot reproduce) must survive the reload.
    expect(fresh.useEditorStore.getState().workspaceJsonByPressCount[3]).toEqual(markerJson);
  });

  it('backfills workspaceJson from steps for old payloads that lack it', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        behaviors: [{ pressCount: 2, label: 'old', steps: [{ kind: 'rotate', degrees: 90 }] }],
      }),
    );
    const mod = await import('./editor-store');
    const json = mod.useEditorStore.getState().workspaceJsonByPressCount[2] as {
      blocks?: { blocks?: Array<{ type: string }> };
    };
    expect(json?.blocks?.blocks?.[0]?.type).toBe('rotate_degrees');
  });
});
