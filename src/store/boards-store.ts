import { create } from 'zustand';
import type { BoardState } from '../sim/boards/schema';
import { parseBoard } from '../sim/boards/schema';
import {
  bundledBoards,
  mazeBoard,
  findBundledBoard,
  isBundledBoardId,
} from '../sim/boards/default';
import { RANDOM_BOARD_ID, generateRandomBoard } from '../sim/boards/random';
import type { RunRecord } from '../sim/replay';

const BOARDS_KEY = 'scribbler-sim:boards:v1';
const RUNS_KEY = 'scribbler-sim:runs:v1';
const RUNS_PER_BOARD_CAP = 10;

interface PersistedBoards {
  version: 1;
  customBoards: Record<string, BoardState>;
  activeBoardId: string;
}

interface PersistedRuns {
  version: 1;
  byBoard: Record<string, RunRecord[]>;
}

const loadBoards = (): { customBoards: Record<string, BoardState>; activeBoardId: string } => {
  try {
    const raw = localStorage.getItem(BOARDS_KEY);
    if (!raw) return { customBoards: {}, activeBoardId: mazeBoard.id };
    const parsed = JSON.parse(raw) as PersistedBoards;
    if (parsed.version !== 1) return { customBoards: {}, activeBoardId: mazeBoard.id };
    const validated: Record<string, BoardState> = {};
    for (const [id, b] of Object.entries(parsed.customBoards ?? {})) {
      try {
        validated[id] = parseBoard(b);
      } catch {
        // skip invalid board
      }
    }
    return {
      customBoards: validated,
      activeBoardId: typeof parsed.activeBoardId === 'string' ? parsed.activeBoardId : mazeBoard.id,
    };
  } catch {
    return { customBoards: {}, activeBoardId: mazeBoard.id };
  }
};

const loadRuns = (): Record<string, RunRecord[]> => {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedRuns;
    if (parsed.version !== 1 || typeof parsed.byBoard !== 'object' || parsed.byBoard === null) {
      return {};
    }
    const out: Record<string, RunRecord[]> = {};
    for (const [boardId, runs] of Object.entries(parsed.byBoard)) {
      if (Array.isArray(runs)) out[boardId] = runs.slice(0, RUNS_PER_BOARD_CAP);
    }
    return out;
  } catch {
    return {};
  }
};

const persistBoards = (customBoards: Record<string, BoardState>, activeBoardId: string): void => {
  const payload: PersistedBoards = { version: 1, customBoards, activeBoardId };
  localStorage.setItem(BOARDS_KEY, JSON.stringify(payload));
};

const persistRuns = (byBoard: Record<string, RunRecord[]>): void => {
  const payload: PersistedRuns = { version: 1, byBoard };
  localStorage.setItem(RUNS_KEY, JSON.stringify(payload));
};

export const newBoardId = (): string =>
  `board-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createBlankBoard = (name: string): BoardState => ({
  version: 1,
  id: newBoardId(),
  name,
  width: 1,
  height: 1,
  elements: [
    { kind: 'start', x: 0.05, y: 0.05, heading: 0 },
    { kind: 'goal', x: 0.92, y: 0.92, toleranceCm: 5 },
  ],
});

interface BoardsStoreState {
  customBoards: Record<string, BoardState>;
  activeBoardId: string;
  runsByBoard: Record<string, RunRecord[]>;
  /** Transient, regenerated-in-place random board — never persisted, never in the saved list. */
  randomBoard: BoardState | null;
  getActiveBoard: () => BoardState;
  listBoards: () => BoardState[];
  setActiveBoard: (id: string) => void;
  saveBoard: (board: BoardState) => void;
  deleteBoard: (id: string) => void;
  /** Generate a fresh, guaranteed-solvable random board and make it the active board. */
  loadRandomBoard: () => BoardState;
  recordRun: (run: RunRecord) => void;
  getRunsForBoard: (id: string) => RunRecord[];
  resetAll: () => void;
}

const initial = (): {
  customBoards: Record<string, BoardState>;
  activeBoardId: string;
  runsByBoard: Record<string, RunRecord[]>;
} => {
  const { customBoards, activeBoardId } = loadBoards();
  return { customBoards, activeBoardId, runsByBoard: loadRuns() };
};

export const useBoardsStore = create<BoardsStoreState>((set, get) => ({
  ...initial(),
  randomBoard: null,

  getActiveBoard: () => {
    const { activeBoardId, customBoards, randomBoard } = get();
    if (activeBoardId === RANDOM_BOARD_ID && randomBoard) return randomBoard;
    const bundled = findBundledBoard(activeBoardId);
    if (bundled) return bundled;
    return customBoards[activeBoardId] ?? mazeBoard;
  },

  listBoards: () => {
    const { customBoards } = get();
    return [...bundledBoards, ...Object.values(customBoards)];
  },

  setActiveBoard: (id) => {
    set({ activeBoardId: id });
    persistBoards(get().customBoards, id);
  },

  saveBoard: (board) => {
    if (isBundledBoardId(board.id)) return;
    const customBoards = { ...get().customBoards, [board.id]: board };
    set({ customBoards });
    persistBoards(customBoards, get().activeBoardId);
  },

  loadRandomBoard: () => {
    const board = generateRandomBoard();
    // Random boards are transient: held in memory, never written to the custom
    // list or localStorage, so repeated clicks don't accumulate clutter.
    set({ randomBoard: board, activeBoardId: RANDOM_BOARD_ID });
    return board;
  },

  deleteBoard: (id) => {
    if (isBundledBoardId(id)) return;
    const customBoards = { ...get().customBoards };
    delete customBoards[id];
    const runsByBoard = { ...get().runsByBoard };
    delete runsByBoard[id];
    const activeBoardId = get().activeBoardId === id ? mazeBoard.id : get().activeBoardId;
    set({ customBoards, runsByBoard, activeBoardId });
    persistBoards(customBoards, activeBoardId);
    persistRuns(runsByBoard);
  },

  recordRun: (run) => {
    const existing = get().runsByBoard[run.boardId] ?? [];
    const updated = [run, ...existing].slice(0, RUNS_PER_BOARD_CAP);
    const runsByBoard = { ...get().runsByBoard, [run.boardId]: updated };
    set({ runsByBoard });
    persistRuns(runsByBoard);
  },

  getRunsForBoard: (id) => get().runsByBoard[id] ?? [],

  resetAll: () => {
    set({ customBoards: {}, activeBoardId: mazeBoard.id, runsByBoard: {}, randomBoard: null });
    localStorage.removeItem(BOARDS_KEY);
    localStorage.removeItem(RUNS_KEY);
  },
}));
