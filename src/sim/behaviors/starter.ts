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

/**
 * Grade 5 starter — the grade-4 layout plus 45° turns on the two free slots,
 * matching the diagonal moves the grade-5 competition boards require.
 */
export const grade5ProgramSample: StarterEntry[] = [
  ...classProgramSample,
  { pressCount: 7, steps: [{ kind: 'rotate', degrees: 45 }] },
  { pressCount: 8, steps: [{ kind: 'rotate', degrees: -45 }] },
];

/**
 * A 50ms line-follower control slice: veer one way when the left sensor sees
 * the line, the other way when the right sensor does, else drive straight.
 */
const followerSlice: Step = {
  kind: 'if',
  condition: { kind: 'line_left' },
  then: [{ kind: 'drive_wheels', leftSpeedPct: 15, rightSpeedPct: 60, durationMs: 50 }],
  else: [
    {
      kind: 'if',
      condition: { kind: 'line_right' },
      then: [{ kind: 'drive_wheels', leftSpeedPct: 60, rightSpeedPct: 15, durationMs: 50 }],
      else: [{ kind: 'drive_wheels', leftSpeedPct: 55, rightSpeedPct: 55, durationMs: 50 }],
    },
  ],
};

/**
 * Grades 7-9 starter — motor-level practice for the line-track boards:
 * tank drive, in-place pivots (wheels counter-rotating), and a bang-bang
 * line follower on press 4. Follower gains are validated by
 * grade79-follower.validation.test.ts; tune there, not by eye.
 */
export const grade79ProgramSample: StarterEntry[] = [
  {
    pressCount: 1,
    steps: [{ kind: 'drive_wheels', leftSpeedPct: 55, rightSpeedPct: 55, durationMs: 1000 }],
  },
  {
    pressCount: 2,
    steps: [{ kind: 'drive_wheels', leftSpeedPct: -40, rightSpeedPct: 40, durationMs: 350 }],
  },
  {
    pressCount: 3,
    steps: [{ kind: 'drive_wheels', leftSpeedPct: 40, rightSpeedPct: -40, durationMs: 350 }],
  },
  { pressCount: 4, steps: [{ kind: 'repeat', times: 3000, body: [followerSlice] }] },
];
