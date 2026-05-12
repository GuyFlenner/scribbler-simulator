import type { Step } from './schema';

/**
 * The kid's confirmed competition button layout (May 2026).
 * Each entry is one press-count slot as the kid will use in the competition.
 */
export interface StarterEntry {
  pressCount: number;
  steps: Step[];
}

export const classProgramSample: StarterEntry[] = [
  { pressCount: 1, steps: [{ kind: 'drive', cm: 10 }] },
  { pressCount: 2, steps: [{ kind: 'drive', cm: 20 }] },
  { pressCount: 3, steps: [{ kind: 'drive', cm: 40 }] },
  { pressCount: 4, steps: [{ kind: 'rotate', degrees: 90 }] },
  { pressCount: 5, steps: [{ kind: 'rotate', degrees: -90 }] },
  { pressCount: 6, steps: [{ kind: 'rotate', degrees: 180 }] },
];
