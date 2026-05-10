import type { Step } from './schema';

/**
 * Pre-fill values transcribed from the kid's class program photo
 * (Scribbler Program Maker S3 v2.0, March 2026). Each entry mirrors
 * a `=N do drive_speed(L%, R%, Xs)` page from that screenshot.
 *
 * **These are best-guess values from a photo.** Verify with the kid
 * (especially press 5 — the sign on the right wheel was hard to read)
 * and adjust each row in the editor as needed.
 *
 * Press 5 here is encoded as `(-100, 100)` = spin in place to the LEFT,
 * which is the most plausible interpretation given the surrounding
 * spin patterns. If it turns out to be `(-100, -100)` (drive backward),
 * change it in the editor.
 */
export interface StarterEntry {
  pressCount: number;
  steps: Step[];
}

export const classProgramSample: StarterEntry[] = [
  { pressCount: 1, steps: [{ kind: 'drive_wheels', leftSpeedPct: 100, rightSpeedPct: 100, durationMs: 1000 }] },
  { pressCount: 2, steps: [{ kind: 'drive_wheels', leftSpeedPct: 100, rightSpeedPct: 100, durationMs: 2000 }] },
  { pressCount: 3, steps: [{ kind: 'drive_wheels', leftSpeedPct: 100, rightSpeedPct: 100, durationMs: 4000 }] },
  { pressCount: 4, steps: [{ kind: 'drive_wheels', leftSpeedPct: 100, rightSpeedPct: -100, durationMs: 1000 }] },
  { pressCount: 5, steps: [{ kind: 'drive_wheels', leftSpeedPct: -100, rightSpeedPct: 100, durationMs: 1000 }] },
  { pressCount: 6, steps: [{ kind: 'drive_wheels', leftSpeedPct: 100, rightSpeedPct: -100, durationMs: 2000 }] },
];
