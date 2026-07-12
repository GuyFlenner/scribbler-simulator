import { create } from 'zustand';
import { DEFAULT_GRADE, isGrade, type Grade } from '../grade/config';

export const GRADE_STORAGE_KEY = 'scribbler-sim:grade:v1';

const hydrateGrade = (): Grade => {
  try {
    const raw = localStorage.getItem(GRADE_STORAGE_KEY);
    return isGrade(raw) ? raw : DEFAULT_GRADE;
  } catch {
    // localStorage unavailable (private mode / SSR) — fall back to default
    return DEFAULT_GRADE;
  }
};

interface GradeStoreState {
  grade: Grade;
  setGrade: (grade: Grade) => void;
}

/**
 * Holds only the selected grade. Side effects of switching (board swap,
 * sim reset) live in the GradeSelector component so this store stays free
 * of dependencies on sim-store/boards-store (prevents import cycles).
 */
export const useGradeStore = create<GradeStoreState>((set) => ({
  grade: hydrateGrade(),
  setGrade: (grade) => {
    if (!isGrade(grade)) return;
    set({ grade });
    try {
      localStorage.setItem(GRADE_STORAGE_KEY, grade);
    } catch {
      // persistence is best-effort; selection still applies for the session
    }
  },
}));
