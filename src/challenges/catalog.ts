import type { Grade } from '../grade/config';
import type { RunRecord } from '../sim/replay';

/**
 * Challenge ladder: a short ordered list of missions per grade, scored with
 * stars from the existing run records. Star 1 = reach the goal; stars 2 and
 * 3 add efficiency criteria, mirroring the competition's "most efficient
 * way" scoring. Grid challenges score by press count (deterministic);
 * track challenges score by run time (a single press runs the whole program,
 * so time measures the program, not the kid's clicking speed).
 *
 * Pure data + pure evaluation — no React, no stores — so thresholds are
 * unit-tested and easy to retune.
 */

export interface StarCriteria {
  maxSeconds?: number;
  maxPresses?: number;
  requireBonus?: boolean;
}

export interface Challenge {
  id: string;
  /** i18n keys under challenges.* */
  titleKey: string;
  descKey: string;
  grade: Grade;
  /** Bundled board the challenge runs on. */
  boardId: string;
  /** Criteria for the 2nd star (1st star = outcome reached-goal). */
  star2: StarCriteria;
  /** Criteria for the 3rd star (must also meet star2). */
  star3: StarCriteria;
}

export const CHALLENGES: readonly Challenge[] = [
  // Grade 4 — press-count efficiency on the grid boards. Minimum press
  // solutions with the class starter set are noted next to each threshold.
  {
    id: 'g4-first-drive',
    titleKey: 'challenges.g4_first_drive_title',
    descKey: 'challenges.g4_first_drive_desc',
    grade: 'grade4',
    boardId: 'default',
    star2: { maxPresses: 9 },
    star3: { maxPresses: 7 }, // min with starter set: 40+40+10, turn, 40+40+10
  },
  {
    id: 'g4-bonus-hunter',
    titleKey: 'challenges.g4_bonus_hunter_title',
    descKey: 'challenges.g4_bonus_hunter_desc',
    grade: 'grade4',
    boardId: 'default-bonus',
    star2: { requireBonus: true },
    star3: { requireBonus: true, maxPresses: 8 }, // min via bonus: 8 presses
  },
  {
    id: 'g4-maze-runner',
    titleKey: 'challenges.g4_maze_runner_title',
    descKey: 'challenges.g4_maze_runner_desc',
    grade: 'grade4',
    boardId: 'maze',
    star2: { maxPresses: 26 },
    star3: { maxPresses: 20 }, // shortest path is 24 cells with long straights
  },

  // Grade 5 — the diagonal board, first by press count, then against the clock.
  {
    id: 'g5-diagonal-path',
    titleKey: 'challenges.g5_diagonal_path_title',
    descKey: 'challenges.g5_diagonal_path_desc',
    grade: 'grade5',
    boardId: 'diagonal',
    star2: { maxPresses: 12 },
    star3: { maxPresses: 10 }, // min with grade-5 starter: 4 turns + 6 drives
  },
  {
    id: 'g5-speedrun',
    titleKey: 'challenges.g5_speedrun_title',
    descKey: 'challenges.g5_speedrun_desc',
    grade: 'grade5',
    boardId: 'diagonal',
    star2: { maxSeconds: 90 },
    star3: { maxSeconds: 60 },
  },

  // Grades 7-9 — the racing track, then the one-press follower mastery run.
  {
    id: 'g79-racing',
    titleKey: 'challenges.g79_racing_title',
    descKey: 'challenges.g79_racing_desc',
    grade: 'grade79',
    boardId: 'track-serpentine',
    star2: { maxSeconds: 75 },
    star3: { maxSeconds: 45 }, // the proportional follow_line makes this
  },
  {
    id: 'g79-one-press',
    titleKey: 'challenges.g79_one_press_title',
    descKey: 'challenges.g79_one_press_desc',
    grade: 'grade79',
    boardId: 'track-serpentine',
    star2: { maxPresses: 1 },
    star3: { maxPresses: 1, maxSeconds: 45 },
  },
];

export const challengesForGrade = (grade: Grade): Challenge[] =>
  CHALLENGES.filter((c) => c.grade === grade);

export const findChallenge = (id: string): Challenge | undefined =>
  CHALLENGES.find((c) => c.id === id);

const meets = (criteria: StarCriteria, run: RunRecord): boolean =>
  (criteria.maxSeconds === undefined || run.durationMs <= criteria.maxSeconds * 1000) &&
  (criteria.maxPresses === undefined || run.pressCountTotal <= criteria.maxPresses) &&
  (!criteria.requireBonus || run.bonusHit === true);

/** Stars earned by a run: 0 (failed) to 3. Star tiers are cumulative. */
export const evaluateStars = (challenge: Challenge, run: RunRecord): 0 | 1 | 2 | 3 => {
  if (run.outcome !== 'reached-goal') return 0;
  if (run.boardId !== challenge.boardId) return 0;
  if (!meets(challenge.star2, run)) return 1;
  if (!meets(challenge.star3, run)) return 2;
  return 3;
};
