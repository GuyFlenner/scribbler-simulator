import { create } from 'zustand';
import { evaluateStars, findChallenge } from '../challenges/catalog';
import type { RunRecord } from '../sim/replay';

export const CHALLENGES_STORAGE_KEY = 'scribbler-sim:challenges:v1';

interface PersistedChallenges {
  version: 1;
  starsByChallenge: Record<string, number>;
}

const loadStars = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(CHALLENGES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedChallenges;
    if (parsed.version !== 1 || typeof parsed.starsByChallenge !== 'object') return {};
    const out: Record<string, number> = {};
    for (const [id, stars] of Object.entries(parsed.starsByChallenge ?? {})) {
      // Only accept known challenges and sane star counts — garbage is dropped.
      if (!findChallenge(id)) continue;
      if (typeof stars !== 'number' || !Number.isInteger(stars)) continue;
      out[id] = Math.max(0, Math.min(3, stars));
    }
    return out;
  } catch {
    return {};
  }
};

const persistStars = (starsByChallenge: Record<string, number>): void => {
  const payload: PersistedChallenges = { version: 1, starsByChallenge };
  try {
    localStorage.setItem(CHALLENGES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // best-effort persistence; the session still works
  }
};

export interface ChallengeResult {
  challengeId: string;
  stars: 0 | 1 | 2 | 3;
  runId: string;
}

interface ChallengesStoreState {
  /** Best stars ever earned per challenge id. */
  starsByChallenge: Record<string, number>;
  /** Challenge the kid is currently attempting (survives retries). */
  activeChallengeId: string | null;
  /** Outcome of the latest completed run while a challenge was active. */
  lastResult: ChallengeResult | null;
  startChallenge: (id: string) => void;
  clearActive: () => void;
  /** Called by sim-store when a run record is written. */
  recordResult: (run: RunRecord) => void;
  resetAll: () => void;
}

export const useChallengesStore = create<ChallengesStoreState>((set, get) => ({
  starsByChallenge: loadStars(),
  activeChallengeId: null,
  lastResult: null,

  startChallenge: (id) => {
    if (!findChallenge(id)) return;
    set({ activeChallengeId: id, lastResult: null });
  },

  clearActive: () => set({ activeChallengeId: null, lastResult: null }),

  recordResult: (run) => {
    const { activeChallengeId, starsByChallenge } = get();
    if (!activeChallengeId) return;
    const challenge = findChallenge(activeChallengeId);
    // Ignore runs on other boards (kid switched board mid-challenge).
    if (!challenge || challenge.boardId !== run.boardId) return;
    const stars = evaluateStars(challenge, run);
    const best = starsByChallenge[activeChallengeId] ?? 0;
    const nextStars =
      stars > best ? { ...starsByChallenge, [activeChallengeId]: stars } : starsByChallenge;
    if (stars > best) persistStars(nextStars);
    set({
      starsByChallenge: nextStars,
      lastResult: { challengeId: activeChallengeId, stars, runId: run.id },
    });
  },

  resetAll: () => {
    set({ starsByChallenge: {}, activeChallengeId: null, lastResult: null });
    try {
      localStorage.removeItem(CHALLENGES_STORAGE_KEY);
    } catch {
      // nothing to clean
    }
  },
}));
