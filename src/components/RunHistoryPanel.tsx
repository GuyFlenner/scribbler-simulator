import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useBoardsStore } from '../store/boards-store';
import { useSimStore } from '../store/sim-store';
import type { RunRecord } from '../sim/replay';

const EMPTY_RUNS: RunRecord[] = [];

export function RunHistoryPanel({ boardId }: { boardId: string }): ReactElement {
  const { t } = useTranslation();
  const runs = useBoardsStore((s) => s.runsByBoard[boardId]) ?? EMPTY_RUNS;
  const startReplay = useSimStore((s) => s.startReplay);

  return (
    <section style={{ marginTop: '1rem' }}>
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>{t('boards.runs_heading')}</h3>
      {runs.length === 0 ? (
        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{t('boards.no_runs')}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {runs.map((run) => (
            <li
              key={run.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.4rem 0.6rem',
                background: '#f5f5f5',
                borderRadius: 4,
                fontSize: '0.85rem',
              }}
            >
              <span>
                {t('boards.run_summary', {
                  seconds: (run.durationMs / 1000).toFixed(1),
                  presses: run.pressCountTotal,
                })}
                {run.outcome === 'reached-goal' ? ' ✅' : ' ⛔'}
              </span>
              <button
                type="button"
                onClick={() => startReplay(run)}
                style={{
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  borderRadius: 4,
                  border: '1px solid #555',
                  background: '#fff',
                }}
              >
                {t('boards.replay')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
