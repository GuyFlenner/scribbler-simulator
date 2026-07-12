import { describe, it, expect } from 'vitest';
import { CHALLENGES, challengesForGrade, evaluateStars, findChallenge } from './catalog';
import { GRADES, getGradeConfig } from '../grade/config';
import { findBundledBoard } from '../sim/boards/default';
import type { RunRecord } from '../sim/replay';
import type { Challenge } from './catalog';

const run = (overrides: Partial<RunRecord> = {}): RunRecord => ({
  id: 'run-1',
  boardId: 'default',
  startedAt: 0,
  durationMs: 30_000,
  events: [],
  outcome: 'reached-goal',
  pressCountTotal: 5,
  bonusHit: false,
  ...overrides,
});

describe('challenge catalog — integrity', () => {
  it('every challenge references an existing bundled board and a known grade', () => {
    for (const c of CHALLENGES) {
      expect(findBundledBoard(c.boardId), `${c.id} board`).toBeDefined();
      expect(GRADES).toContain(c.grade);
    }
  });

  it('challenge ids are unique', () => {
    const ids = CHALLENGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every grade has at least two challenges', () => {
    for (const g of GRADES) {
      expect(challengesForGrade(g).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('challenge boards are offered in their grade (bundledBoardIds)', () => {
    for (const c of CHALLENGES) {
      expect(getGradeConfig(c.grade).bundledBoardIds, `${c.id} board in grade`).toContain(
        c.boardId,
      );
    }
  });

  it('findChallenge resolves known ids and rejects unknown ones', () => {
    expect(findChallenge('g4-first-drive')?.grade).toBe('grade4');
    expect(findChallenge('nope')).toBeUndefined();
  });
});

describe('evaluateStars', () => {
  const challenge: Challenge = {
    id: 'test',
    titleKey: 't',
    descKey: 'd',
    grade: 'grade4',
    boardId: 'default',
    star2: { maxPresses: 8 },
    star3: { maxPresses: 6, maxSeconds: 60 },
  };

  it('0 stars for a stalled run or a run on the wrong board', () => {
    expect(evaluateStars(challenge, run({ outcome: 'stalled' }))).toBe(0);
    expect(evaluateStars(challenge, run({ boardId: 'maze' }))).toBe(0);
  });

  it('1 star for reaching the goal without meeting star-2 criteria', () => {
    expect(evaluateStars(challenge, run({ pressCountTotal: 12 }))).toBe(1);
  });

  it('2 stars when star-2 criteria are met but star-3 are not', () => {
    expect(evaluateStars(challenge, run({ pressCountTotal: 8 }))).toBe(2);
    // star-3 needs BOTH fewer presses and the time bound
    expect(evaluateStars(challenge, run({ pressCountTotal: 6, durationMs: 90_000 }))).toBe(2);
  });

  it('3 stars when all criteria are met', () => {
    expect(evaluateStars(challenge, run({ pressCountTotal: 6, durationMs: 45_000 }))).toBe(3);
  });

  it('star tiers are cumulative: meeting star-3 without star-2 gives only 1 star', () => {
    const c: Challenge = { ...challenge, star2: { maxPresses: 3 }, star3: { maxSeconds: 60 } };
    // Fast (meets star3's time) but too many presses (fails star2) → 1 star.
    expect(evaluateStars(c, run({ pressCountTotal: 10, durationMs: 10_000 }))).toBe(1);
  });

  it('requireBonus is honoured', () => {
    const c: Challenge = { ...challenge, star2: { requireBonus: true }, star3: { maxPresses: 4 } };
    expect(evaluateStars(c, run({ bonusHit: false }))).toBe(1);
    expect(evaluateStars(c, run({ bonusHit: true, pressCountTotal: 9 }))).toBe(2);
    expect(evaluateStars(c, run({ bonusHit: true, pressCountTotal: 4 }))).toBe(3);
  });
});
