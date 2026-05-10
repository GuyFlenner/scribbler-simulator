import type { ReactElement } from 'react';
import { useSimStore } from '../store/sim-store';
import { hardcodedBehaviors } from '../sim/behaviors/hardcoded';

export function PressButtons(): ReactElement {
  const pressButton = useSimStore((s) => s.pressButton);
  const resetBoard = useSimStore((s) => s.resetBoard);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Behaviors</h2>
      {hardcodedBehaviors.map((b) => (
        <button
          key={b.pressCount}
          type="button"
          aria-label={`Press reset ${b.pressCount} times — ${b.label}`}
          onClick={() => pressButton(b.pressCount)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.95rem',
            cursor: 'pointer',
            borderRadius: 4,
            border: '1px solid #555',
            background: '#fff',
            textAlign: 'left',
          }}
        >
          <strong>Press {b.pressCount}×</strong> — {b.label}
        </button>
      ))}
      <button
        type="button"
        onClick={resetBoard}
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
    </div>
  );
}
