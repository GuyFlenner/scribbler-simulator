import { useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useBoardsStore, createBlankBoard } from '../store/boards-store';
import { useSimStore } from '../store/sim-store';
import { bundledBoards, defaultBoard, isBundledBoardId } from '../sim/boards/default';
import { RANDOM_BOARD_ID } from '../sim/boards/random';
import type { BoardState } from '../sim/boards/schema';
import { BoardEditor } from './BoardEditor';
import { BoardThumbnail } from './BoardThumbnail';
import { RunHistoryPanel } from './RunHistoryPanel';

export function BoardsPanel(): ReactElement {
  const { t } = useTranslation();
  const customBoards = useBoardsStore((s) => s.customBoards);
  const randomBoard = useBoardsStore((s) => s.randomBoard);
  const boards = useMemo<BoardState[]>(
    () => [
      ...bundledBoards,
      ...Object.values(customBoards),
      ...(randomBoard ? [randomBoard] : []),
    ],
    [customBoards, randomBoard],
  );
  const activeBoardId = useBoardsStore((s) => s.activeBoardId);
  const setActiveBoard = useBoardsStore((s) => s.setActiveBoard);
  const saveBoard = useBoardsStore((s) => s.saveBoard);
  const deleteBoard = useBoardsStore((s) => s.deleteBoard);
  const loadRandomBoard = useBoardsStore((s) => s.loadRandomBoard);
  const setSimBoard = useSimStore((s) => s.setBoard);
  const [editing, setEditing] = useState<BoardState | null>(null);

  const handleSelect = (board: BoardState): void => {
    setActiveBoard(board.id);
    setSimBoard(board);
  };

  const handleNew = (): void => {
    setEditing(createBlankBoard(t('boards.new_board_default_name')));
  };

  const handleGenerateRandom = (): void => {
    const board = loadRandomBoard();
    setSimBoard(board);
  };

  const handleEdit = (board: BoardState): void => {
    if (isBundledBoardId(board.id)) return;
    setEditing(board);
  };

  const handleDelete = (board: BoardState): void => {
    if (isBundledBoardId(board.id)) return;
    if (window.confirm(t('boards.delete_confirm', { name: board.name }))) {
      deleteBoard(board.id);
      if (activeBoardId === board.id) setSimBoard(defaultBoard);
    }
  };

  const handleSaveEdit = (board: BoardState): void => {
    saveBoard(board);
    if (board.id === activeBoardId) setSimBoard(board);
    setEditing(null);
  };

  if (editing) {
    return (
      <BoardEditor
        board={editing}
        onSave={handleSaveEdit}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div style={{ padding: '0 1rem', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 280 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t('boards.list_heading')}</h2>
          <span style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={handleGenerateRandom}
              style={{ padding: '0.3rem 0.7rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #2c5cff', background: '#fff', color: '#2c5cff', fontSize: '0.85rem' }}
            >
              🎲 {t('boards.generate_random')}
            </button>
            <button
              type="button"
              onClick={handleNew}
              style={{ padding: '0.3rem 0.7rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #2c5cff', background: '#2c5cff', color: '#fff', fontSize: '0.85rem' }}
            >
              + {t('boards.new_board')}
            </button>
          </span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {boards.map((board) => {
            const isActive = board.id === activeBoardId;
            const isBundled = isBundledBoardId(board.id);
            const isRandom = board.id === RANDOM_BOARD_ID;
            const displayName = isRandom
              ? `${t('boards.random_name')} 🎲`
              : board.id === 'maze'
                ? `${t('boards.maze_name')} 🌀`
                : board.name;
            return (
              <li
                key={board.id}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 4,
                  border: isActive ? '2px solid #2c5cff' : '1px solid #aaa',
                  background: isActive ? '#e8f0ff' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
                  <BoardThumbnail board={board} size={56} ariaLabel={board.name} />
                  <span>
                    {displayName}
                    {isActive && (
                      <span style={{ marginInlineStart: 8, fontSize: '0.75rem', color: '#2c5cff' }}>
                        ({t('boards.active_badge')})
                      </span>
                    )}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => handleSelect(board)}
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #555', background: '#fff' }}
                  >
                    {t('boards.select')}
                  </button>
                  {!isBundled && !isRandom && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEdit(board)}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #555', background: '#fff' }}
                      >
                        {t('boards.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(board)}
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 4, border: '1px solid #c0392b', background: '#fff', color: '#c0392b' }}
                      >
                        {t('boards.delete')}
                      </button>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div style={{ flex: 1, minWidth: 280 }}>
        <RunHistoryPanel boardId={activeBoardId} />
      </div>
    </div>
  );
}
