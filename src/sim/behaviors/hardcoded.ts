import type { Behavior } from './schema';

/**
 * No hardcoded fallback behaviors. The kid's class program is custom and the
 * simulator's press-button semantics must match it exactly — see the teacher
 * conversation logged in docs/research/competition-format.md. Until the parent
 * configures each press-count via the editor, all press buttons render as
 * "not configured" rather than guessing.
 */
export const hardcodedBehaviors: Behavior[] = [];

export const findBehavior = (pressCount: number): Behavior | undefined =>
  hardcodedBehaviors.find((b) => b.pressCount === pressCount);
