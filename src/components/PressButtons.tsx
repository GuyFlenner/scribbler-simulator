import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/sim-store';
import { useEditorStore, PRESS_COUNTS } from '../store/editor-store';
import { hardcodedBehaviors } from '../sim/behaviors/hardcoded';
import type { Step } from '../sim/behaviors/schema';

const hardcodedSteps = (n: number): Step[] | undefined =>
  hardcodedBehaviors.find((b) => b.pressCount === n)?.steps;

export function PressButtons(): ReactElement {
  const { t } = useTranslation();
  const pressButton = useSimStore((s) => s.pressButton);
  const resetBoard = useSimStore((s) => s.resetBoard);
  const isRunning = useSimStore((s) => s.status === 'running');
  const programs = useEditorStore((s) => s.programs);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

  const handleClick = (n: number): void => {
    const userSteps = programs[n];
    if (userSteps && userSteps.length === 0) {
      setEmptyMessage(t('simulator.empty_program', { count: n }));
      return;
    }
    const steps = userSteps ?? hardcodedSteps(n);
    if (!steps || steps.length === 0) {
      setEmptyMessage(t('simulator.no_behavior_msg', { count: n }));
      return;
    }
    setEmptyMessage(null);
    pressButton(n, steps);
  };

  const labelFor = (_n: number, userSteps: Step[] | undefined): string => {
    if (userSteps && userSteps.length > 0) {
      return t('simulator.block_count', { count: userSteps.length });
    }
    return t('simulator.no_behavior');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t('simulator.behaviors_heading')}</h2>
      {PRESS_COUNTS.map((n) => {
        const userSteps = programs[n];
        const label = labelFor(n, userSteps);
        const isUser = !!(userSteps && userSteps.length > 0);
        const isEmpty = !isUser;
        return (
          <button
            key={n}
            type="button"
            aria-label={t('simulator.press_aria', { count: n, description: label })}
            onClick={() => handleClick(n)}
            disabled={isRunning}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.95rem',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              borderRadius: 4,
              border: isEmpty ? '1px dashed #999' : '1px solid #555',
              background: isUser ? '#e8f4ff' : isEmpty ? '#f5f5f5' : '#fff',
              color: isEmpty ? '#888' : '#000',
              textAlign: 'start',
              opacity: isRunning ? 0.55 : 1,
            }}
          >
            <strong>{t('simulator.press_label', { count: n })}</strong> — {label}
            {isEmpty && (
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#aaa', marginTop: 2 }}>
                {t('simulator.no_behavior_hint')}
              </span>
            )}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          setEmptyMessage(null);
          resetBoard();
        }}
        style={{
          marginTop: 8,
          padding: '0.5rem 1rem',
          fontSize: '0.95rem',
          cursor: 'pointer',
          borderRadius: 4,
          border: '1px solid #555',
          background: '#eee',
        }}
      >
        {t('simulator.reset_board')}
      </button>
      {emptyMessage && (
        <p
          role="status"
          data-testid="press-button-message"
          style={{
            margin: 0,
            padding: '0.5rem 0.75rem',
            background: '#fff7d6',
            border: '1px solid #d4a017',
            borderRadius: 4,
            fontSize: '0.85rem',
            color: '#5a4500',
          }}
        >
          {emptyMessage}
        </p>
      )}
    </div>
  );
}
