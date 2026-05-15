import { describe, it, expect, beforeEach } from 'vitest';
import { useBoardsStore, createBlankBoard } from './boards-store';
import { defaultBoard, mazeBoard } from '../sim/boards/default';
import type { RunRecord } from '../sim/replay';

beforeEach(() => {
  localStorage.clear();
  useBoardsStore.getState().resetAll();
});

describe('boards-store — list + select', () => {
  it('lists all three bundled boards (maze first, then default, then bonus) on a fresh state', () => {
    const boards = useBoardsStore.getState().listBoards();
    expect(boards).toHaveLength(3);
    expect(boards[0].id).toBe('maze');
    expect(boards[1].id).toBe(defaultBoard.id);
    expect(boards[2].id).toBe('default-bonus');
  });

  it('defaults the active board to maze on a fresh state', () => {
    expect(useBoardsStore.getState().activeBoardId).toBe('maze');
    expect(useBoardsStore.getState().getActiveBoard().id).toBe('maze');
  });

  it('saves a custom board and lists it after the bundled boards', () => {
    const board = createBlankBoard('Practice 1');
    useBoardsStore.getState().saveBoard(board);
    const boards = useBoardsStore.getState().listBoards();
    expect(boards).toHaveLength(4);
    expect(boards[3].name).toBe('Practice 1');
  });

  it('persists boards across store rebuilds via localStorage', () => {
    const board = createBlankBoard('Persisted');
    useBoardsStore.getState().saveBoard(board);
    const stored = localStorage.getItem('scribbler-sim:boards:v1');
    expect(stored).toContain('Persisted');
  });

  it('refuses to save over a bundled board id', () => {
    useBoardsStore.getState().setActiveBoard(defaultBoard.id);
    useBoardsStore
      .getState()
      .saveBoard({ ...defaultBoard, name: 'Hijacked' });
    expect(useBoardsStore.getState().getActiveBoard().name).toBe(defaultBoard.name);
  });

  it('deleting the active board falls back to maze', () => {
    const board = createBlankBoard('temp');
    useBoardsStore.getState().saveBoard(board);
    useBoardsStore.getState().setActiveBoard(board.id);
    useBoardsStore.getState().deleteBoard(board.id);
    expect(useBoardsStore.getState().getActiveBoard().id).toBe(mazeBoard.id);
  });
});

describe('boards-store — run history', () => {
  const makeRun = (boardId: string, idx: number): RunRecord => ({
    id: `r-${idx}`,
    boardId,
    startedAt: Date.now(),
    durationMs: 1000 * idx,
    events: [],
    outcome: 'reached-goal',
    pressCountTotal: idx,
  });

  it('records runs and returns them most-recent-first', () => {
    const board = createBlankBoard('B');
    useBoardsStore.getState().saveBoard(board);
    useBoardsStore.getState().recordRun(makeRun(board.id, 1));
    useBoardsStore.getState().recordRun(makeRun(board.id, 2));
    const runs = useBoardsStore.getState().getRunsForBoard(board.id);
    expect(runs).toHaveLength(2);
    expect(runs[0].pressCountTotal).toBe(2);
  });

  it('caps per-board run history at 10', () => {
    const board = createBlankBoard('cap');
    useBoardsStore.getState().saveBoard(board);
    for (let i = 1; i <= 15; i++) useBoardsStore.getState().recordRun(makeRun(board.id, i));
    const runs = useBoardsStore.getState().getRunsForBoard(board.id);
    expect(runs).toHaveLength(10);
    expect(runs[0].pressCountTotal).toBe(15);
    expect(runs[9].pressCountTotal).toBe(6);
  });
});
