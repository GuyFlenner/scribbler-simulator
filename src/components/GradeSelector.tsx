import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { GRADES, getGradeConfig, type Grade } from '../grade/config';
import { useGradeStore } from '../store/grade-store';
import { useBoardsStore } from '../store/boards-store';
import { useSimStore } from '../store/sim-store';
import { findBundledBoard, isBundledBoardId } from '../sim/boards/default';
import { RANDOM_BOARD_ID } from '../sim/boards/random';

/**
 * Ensure the active board makes sense for the new grade: bundled boards not
 * offered in the grade (and the transient random board, when the grade has
 * no 🎲) are swapped for the grade's default board. Custom boards always stay.
 */
const reconcileBoardForGrade = (grade: Grade): void => {
  const config = getGradeConfig(grade);
  const { activeBoardId, setActiveBoard } = useBoardsStore.getState();
  const excludedBundled =
    isBundledBoardId(activeBoardId) && !config.bundledBoardIds.includes(activeBoardId);
  const excludedRandom = activeBoardId === RANDOM_BOARD_ID && config.randomBoard === null;
  if (!excludedBundled && !excludedRandom) return;
  const fallback = findBundledBoard(config.defaultBoardId);
  if (!fallback) return;
  setActiveBoard(fallback.id);
  useSimStore.getState().setBoard(fallback);
};

export function GradeSelector(): ReactElement {
  const { t } = useTranslation();
  const grade = useGradeStore((s) => s.grade);
  const setGrade = useGradeStore((s) => s.setGrade);

  const handleSelect = (next: Grade): void => {
    if (next === grade) return;
    // Stop any running program before the world changes underneath it.
    if (useSimStore.getState().status === 'running') {
      useSimStore.getState().resetBoard();
    }
    setGrade(next);
    reconcileBoardForGrade(next);
  };

  return (
    <div role="group" aria-label={t('grade.selector_aria')} style={{ display: 'flex', gap: 4 }}>
      {GRADES.map((g) => {
        const active = grade === g;
        return (
          <button
            key={g}
            type="button"
            aria-pressed={active}
            onClick={() => handleSelect(g)}
            style={{
              padding: '0.3rem 0.7rem',
              cursor: 'pointer',
              borderRadius: 4,
              border: '1px solid #555',
              background: active ? '#2c5cff' : '#fff',
              color: active ? '#fff' : '#000',
              fontSize: '0.85rem',
              fontWeight: active ? 'bold' : 'normal',
            }}
          >
            {t(getGradeConfig(g).labelKey)}
          </button>
        );
      })}
    </div>
  );
}
