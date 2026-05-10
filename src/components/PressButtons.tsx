import { useState, type ReactElement } from 'react';
import { useSimStore } from '../store/sim-store';
import { useEditorStore, PRESS_COUNTS } from '../store/editor-store';
import { hardcodedBehaviors } from '../sim/behaviors/hardcoded';
import type { Step } from '../sim/behaviors/schema';

const hardcodedLabel = (n: number): string | undefined =>
  hardcodedBehaviors.find((b) => b.pressCount === n)?.label;

const hardcodedSteps = (n: number): Step[] | undefined =>
  hardcodedBehaviors.find((b) => b.pressCount === n)?.steps;

export function PressButtons(): ReactElement {
  const pressButton = useSimStore((s) => s.pressButton);
  const resetBoard = useSimStore((s) => s.resetBoard);
  const programs = useEditorStore((s) => s.programs);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

  const handleClick = (n: number): void => {
    const userSteps = programs[n];
    if (userSteps && userSteps.length === 0) {
      setEmptyMessage(`Press ${n}× has no blocks yet — drag some in the editor`);
      return;
    }
    const steps = userSteps ?? hardcodedSteps(n);
    if (!steps || steps.length === 0) {
      setEmptyMessage(`Press ${n}× has no behavior defined — open the editor to add one`);
      return;
    }
    setEmptyMessage(null);
    pressButton(n, steps);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 240 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Behaviors</h2>
      {PRESS_COUNTS.map((n) => {
        const userSteps = programs[n];
        const label =
          userSteps && userSteps.length > 0
            ? `${userSteps.length} block${userSteps.length === 1 ? '' : 's'}`
            : hardcodedLabel(n) ?? '— not defined —';
        const isUser = !!(userSteps && userSteps.length > 0);
        return (
          <button
            key={n}
            type="button"
            aria-label={`Press reset ${n} times — ${label}`}
            onClick={() => handleClick(n)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.95rem',
              cursor: 'pointer',
              borderRadius: 4,
              border: '1px solid #555',
              background: isUser ? '#e8f4ff' : '#fff',
              textAlign: 'left',
            }}
          >
            <strong>Press {n}×</strong> — {label}
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
        Reset board
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
