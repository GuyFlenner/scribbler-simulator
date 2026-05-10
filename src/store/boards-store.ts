import { create } from 'zustand';
import type { BoardState } from '../sim/boards/schema';
import { parseBoard } from '../sim/boards/schema';
import { defaultBoard } from '../sim/boards/default';
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
    if (!raw) return { customBoards: {}, activeBoardId: defaultBoard.id };
    const parsed = JSON.parse(raw) as PersistedBoards;
    if (parsed.version !== 1) return { customBoards: {}, activeBoardId: defaultBoard.id };
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
      activeBoardId: typeof parsed.activeBoardId === 'string' ? parsed.activeBoardId : defaultBoard.id,
    };
  } catch {
    return { customBoards: {}, activeBoardId: defaultBoard.id };
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

const persistBoards = (
  customBoards: Record<string, BoardState>,
  activeBoardId: string,
): void => {
  const payload: PersistedBoards = { version: 1, customBoards, activeBoardId };
  localStorage.setItem(BOARDS_KEY, JSON.stringify(payload));
};

const persistRuns = (byBoard: Record<string, RunRecord[]>): void => {
  const payload: PersistedRuns = { version: 1, byBoard };
  localStorage.setItem(RUNS_KEY, JSON.stringify(payload));
};

export const newBoardId = (): string => `board-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  getActiveBoard: () => BoardState;
  listBoards: () => BoardState[];
  setActiveBoard: (id: string) => void;
  saveBoard: (board: BoardState) => void;
  deleteBoard: (id: string) => void;
  recordRun: (run: RunRecord) => void;
  getRunsForBoard: (id: string) => RunRecord[];
  resetAll: () => void;
}

const initial = (): { customBoards: Record<string, BoardState>; activeBoardId: string; runsByBoard: Record<string, RunRecord[]> } => {
  const { customBoards, activeBoardId } = loadBoards();
  return { customBoards, activeBoardId, runsByBoard: loadRuns() };
};

export const useBoardsStore = create<BoardsStoreState>((set, get) => ({
  ...initial(),

  getActiveBoard: () => {
    const { activeBoardId, customBoards } = get();
    if (activeBoardId === defaultBoard.id) return defaultBoard;
    return customBoards[activeBoardId] ?? defaultBoard;
  },

  listBoards: () => {
    const { customBoards } = get();
    return [defaultBoard, ...Object.values(customBoards)];
  },

  setActiveBoard: (id) => {
    set({ activeBoardId: id });
    persistBoards(get().customBoards, id);
  },

  saveBoard: (board) => {
    if (board.id === defaultBoard.id) return;
    const customBoards = { ...get().customBoards, [board.id]: board };
    set({ customBoards });
    persistBoards(customBoards, get().activeBoardId);
  },

  deleteBoard: (id) => {
    if (id === defaultBoard.id) return;
    const customBoards = { ...get().customBoards };
    delete customBoards[id];
    const runsByBoard = { ...get().runsByBoard };
    delete runsByBoard[id];
    const activeBoardId = get().activeBoardId === id ? defaultBoard.id : get().activeBoardId;
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
    set({ customBoards: {}, activeBoardId: defaultBoard.id, runsByBoard: {} });
    localStorage.removeItem(BOARDS_KEY);
    localStorage.removeItem(RUNS_KEY);
  },
}));
