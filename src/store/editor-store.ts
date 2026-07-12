import { create } from 'zustand';
import type { Behavior, Program, Step } from '../sim/behaviors/schema';
import { loadProgram, saveProgram, clearProgram } from '../editor/persistence';
import { classProgramSample, type StarterEntry } from '../sim/behaviors/starter';
import { stepsToWorkspaceJson } from '../editor/codegen';

export const PRESS_COUNT_MIN = 1;
export const PRESS_COUNT_MAX = 8;
export const PRESS_COUNTS: number[] = Array.from(
  { length: PRESS_COUNT_MAX - PRESS_COUNT_MIN + 1 },
  (_, i) => i + PRESS_COUNT_MIN,
);

const programFromBehaviors = (behaviors: Behavior[]): Program => ({
  version: 1,
  behaviors,
});

interface EditorStoreState {
  selectedPressCount: number;
  programs: Record<number, Step[]>;
  workspaceJsonByPressCount: Record<number, unknown>;
  /**
   * Bumped ONLY by non-Blockly program writers (loadStarter, resetAll) so the
   * open BlocklyEditor remounts and shows the new blocks. The Blockly change
   * handler's setBehavior must NOT bump it — that would remount the workspace
   * on every drag.
   */
  externalRevision: number;
  selectPressCount: (n: number) => void;
  setBehavior: (pressCount: number, steps: Step[], workspaceJson?: unknown) => void;
  clearBehavior: (pressCount: number) => void;
  /** Replace ALL press-count slots with a starter set (clears unlisted slots). */
  loadStarter: (entries: readonly StarterEntry[]) => void;
  resetAll: () => void;
  hasUserProgram: (pressCount: number) => boolean;
  getStepsFor: (pressCount: number) => Step[] | undefined;
}

const persistFromState = (
  programs: Record<number, Step[]>,
  workspaceJsonByPressCount: Record<number, unknown>,
): void => {
  const behaviors: Behavior[] = Object.entries(programs)
    .map(([k, steps]) => {
      const behavior: Behavior = {
        pressCount: Number(k),
        label: `Press ${k}× behavior`,
        steps,
      };
      const workspaceJson = workspaceJsonByPressCount[Number(k)];
      if (workspaceJson !== undefined) behavior.workspaceJson = workspaceJson;
      return behavior;
    })
    .filter((b) => b.steps.length > 0);
  if (behaviors.length === 0) {
    clearProgram();
    return;
  }
  saveProgram(programFromBehaviors(behaviors));
};

const starterMaps = (
  entries: readonly StarterEntry[],
): {
  programs: Record<number, Step[]>;
  workspaceJsonByPressCount: Record<number, unknown>;
} => {
  const programs: Record<number, Step[]> = {};
  const workspaceJsonByPressCount: Record<number, unknown> = {};
  for (const entry of entries) {
    programs[entry.pressCount] = entry.steps;
    workspaceJsonByPressCount[entry.pressCount] = stepsToWorkspaceJson(entry.steps);
  }
  return { programs, workspaceJsonByPressCount };
};

const hydrate = (): {
  programs: Record<number, Step[]>;
  workspaceJsonByPressCount: Record<number, unknown>;
} => {
  const loaded = loadProgram();
  if (loaded) {
    const programs: Record<number, Step[]> = {};
    const workspaceJsonByPressCount: Record<number, unknown> = {};
    for (const b of loaded.behaviors) {
      programs[b.pressCount] = b.steps;
      // Prefer the persisted Blockly JSON (exact workspace); fall back to
      // regenerating from steps, which is lossy for and/or/light_above.
      workspaceJsonByPressCount[b.pressCount] = b.workspaceJson ?? stepsToWorkspaceJson(b.steps);
    }
    return { programs, workspaceJsonByPressCount };
  }
  // First load (no localStorage) — seed the kid's competition button layout
  // so `npm run dev` boots with a working program. Returning users keep
  // whatever they had; "Reset all" still clears (resetAll() bypasses this).
  // The default grade is grade4, whose starter IS classProgramSample.
  const maps = starterMaps(classProgramSample);
  persistFromState(maps.programs, maps.workspaceJsonByPressCount);
  return maps;
};

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  selectedPressCount: PRESS_COUNT_MIN,
  externalRevision: 0,
  ...hydrate(),

  selectPressCount: (n) => {
    if (n < PRESS_COUNT_MIN || n > PRESS_COUNT_MAX) return;
    set({ selectedPressCount: n });
  },

  setBehavior: (pressCount, steps, workspaceJson) => {
    if (pressCount < PRESS_COUNT_MIN || pressCount > PRESS_COUNT_MAX) return;
    const programs = { ...get().programs, [pressCount]: steps };
    const workspaceJsonByPressCount = workspaceJson
      ? { ...get().workspaceJsonByPressCount, [pressCount]: workspaceJson }
      : get().workspaceJsonByPressCount;
    set({ programs, workspaceJsonByPressCount });
    persistFromState(programs, workspaceJsonByPressCount);
  },

  clearBehavior: (pressCount) => {
    const programs = { ...get().programs };
    delete programs[pressCount];
    const workspaceJsonByPressCount = { ...get().workspaceJsonByPressCount };
    delete workspaceJsonByPressCount[pressCount];
    set({ programs, workspaceJsonByPressCount });
    persistFromState(programs, workspaceJsonByPressCount);
  },

  loadStarter: (entries) => {
    const { programs, workspaceJsonByPressCount } = starterMaps(entries);
    set({
      programs,
      workspaceJsonByPressCount,
      externalRevision: get().externalRevision + 1,
    });
    persistFromState(programs, workspaceJsonByPressCount);
  },

  resetAll: () => {
    set({
      programs: {},
      workspaceJsonByPressCount: {},
      externalRevision: get().externalRevision + 1,
    });
    clearProgram();
  },

  hasUserProgram: (pressCount) => {
    const steps = get().programs[pressCount];
    return Array.isArray(steps) && steps.length > 0;
  },

  getStepsFor: (pressCount) => get().programs[pressCount],
}));
