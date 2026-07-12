import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CHALLENGES_STORAGE_KEY } from './challenges-store';
import type { RunRecord } from '../sim/replay';

const goalRun = (overrides: Partial<RunRecord> = {}): RunRecord => ({
  id: `run-${Math.random().toString(36).slice(2, 8)}`,
  boardId: 'default',
  startedAt: 0,
  durationMs: 30_000,
  events: [],
  outcome: 'reached-goal',
  pressCountTotal: 5,
  bonusHit: false,
  ...overrides,
});

describe('challenges-store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('startChallenge arms a known challenge and ignores unknown ids', async () => {
    const mod = await import('./challenges-store');
    mod.useChallengesStore.getState().startChallenge('g4-first-drive');
    expect(mod.useChallengesStore.getState().activeChallengeId).toBe('g4-first-drive');
    mod.useChallengesStore.getState().startChallenge('bogus');
    expect(mod.useChallengesStore.getState().activeChallengeId).toBe('g4-first-drive');
  });

  it('recordResult scores the run, keeps the best stars, and persists them', async () => {
    const mod = await import('./challenges-store');
    const store = mod.useChallengesStore.getState();
    store.startChallenge('g4-first-drive'); // board 'default', star3 ≤7 presses

    mod.useChallengesStore.getState().recordResult(goalRun({ pressCountTotal: 7 }));
    expect(mod.useChallengesStore.getState().starsByChallenge['g4-first-drive']).toBe(3);
    expect(mod.useChallengesStore.getState().lastResult?.stars).toBe(3);

    // A worse retry must not downgrade the best.
    mod.useChallengesStore.getState().recordResult(goalRun({ pressCountTotal: 20 }));
    expect(mod.useChallengesStore.getState().starsByChallenge['g4-first-drive']).toBe(3);
    expect(mod.useChallengesStore.getState().lastResult?.stars).toBe(1);

    // Persisted and hydrated on reload.
    vi.resetModules();
    const fresh = await import('./challenges-store');
    expect(fresh.useChallengesStore.getState().starsByChallenge['g4-first-drive']).toBe(3);
  });

  it('ignores runs when no challenge is active or the board does not match', async () => {
    const mod = await import('./challenges-store');
    mod.useChallengesStore.getState().recordResult(goalRun());
    expect(mod.useChallengesStore.getState().lastResult).toBeNull();

    mod.useChallengesStore.getState().startChallenge('g4-first-drive');
    mod.useChallengesStore.getState().recordResult(goalRun({ boardId: 'maze' }));
    expect(mod.useChallengesStore.getState().lastResult).toBeNull();
  });

  it('drops garbage from localStorage on hydrate', async () => {
    localStorage.setItem(
      CHALLENGES_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        starsByChallenge: { 'g4-first-drive': 99, unknown: 3, 'g4-maze-runner': 'three' },
      }),
    );
    const mod = await import('./challenges-store');
    const stars = mod.useChallengesStore.getState().starsByChallenge;
    expect(stars['g4-first-drive']).toBe(3); // clamped
    expect(stars.unknown).toBeUndefined();
    expect(stars['g4-maze-runner']).toBeUndefined();
  });

  it('resetAll clears state and storage', async () => {
    const mod = await import('./challenges-store');
    mod.useChallengesStore.getState().startChallenge('g4-first-drive');
    mod.useChallengesStore.getState().recordResult(goalRun());
    mod.useChallengesStore.getState().resetAll();
    expect(mod.useChallengesStore.getState().starsByChallenge).toEqual({});
    expect(mod.useChallengesStore.getState().activeChallengeId).toBeNull();
    expect(localStorage.getItem(CHALLENGES_STORAGE_KEY)).toBeNull();
  });
});
