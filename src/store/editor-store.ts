import { create } from 'zustand';
import type { Behavior, Program, Step } from '../sim/behaviors/schema';
import { loadProgram, saveProgram, clearProgram } from '../editor/persistence';

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
  selectPressCount: (n: number) => void;
  setBehavior: (pressCount: number, steps: Step[], workspaceJson?: unknown) => void;
  clearBehavior: (pressCount: number) => void;
  resetAll: () => void;
  hasUserProgram: (pressCount: number) => boolean;
  getStepsFor: (pressCount: number) => Step[] | undefined;
}

const persistFromState = (programs: Record<number, Step[]>): void => {
  const behaviors: Behavior[] = Object.entries(programs)
    .map(([k, steps]) => ({
      pressCount: Number(k),
      label: `Press ${k}× behavior`,
      steps,
    }))
    .filter((b) => b.steps.length > 0);
  if (behaviors.length === 0) {
    clearProgram();
    return;
  }
  saveProgram(programFromBehaviors(behaviors));
};

const hydrate = (): {
  programs: Record<number, Step[]>;
  workspaceJsonByPressCount: Record<number, unknown>;
} => {
  const loaded = loadProgram();
  const programs: Record<number, Step[]> = {};
  if (loaded) {
    for (const b of loaded.behaviors) {
      programs[b.pressCount] = b.steps;
    }
  }
  return { programs, workspaceJsonByPressCount: {} };
};

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  selectedPressCount: PRESS_COUNT_MIN,
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
    persistFromState(programs);
  },

  clearBehavior: (pressCount) => {
    const programs = { ...get().programs };
    delete programs[pressCount];
    const workspaceJsonByPressCount = { ...get().workspaceJsonByPressCount };
    delete workspaceJsonByPressCount[pressCount];
    set({ programs, workspaceJsonByPressCount });
    persistFromState(programs);
  },

  resetAll: () => {
    set({ programs: {}, workspaceJsonByPressCount: {} });
    clearProgram();
  },

  hasUserProgram: (pressCount) => {
    const steps = get().programs[pressCount];
    return Array.isArray(steps) && steps.length > 0;
  },

  getStepsFor: (pressCount) => get().programs[pressCount],
}));
