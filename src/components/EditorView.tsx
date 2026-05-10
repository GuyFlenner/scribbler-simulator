import { type ReactElement } from 'react';
import { BlocklyEditor } from '../editor/BlocklyEditor';
import { useEditorStore } from '../store/editor-store';
import { PressCountTabs } from './PressCountTabs';

export function EditorView(): ReactElement {
  const selected = useEditorStore((s) => s.selectedPressCount);
  const resetAll = useEditorStore((s) => s.resetAll);
  const programs = useEditorStore((s) => s.programs);
  const stepsForSelected = programs[selected];

  const handleResetAll = (): void => {
    if (window.confirm('Reset all behaviors? This cannot be undone.')) {
      resetAll();
    }
  };

  return (
    <div style={{ padding: '0 1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 0,
        }}
      >
        <PressCountTabs />
        <button
          type="button"
          onClick={handleResetAll}
          style={{
            padding: '0.4rem 0.8rem',
            fontSize: '0.85rem',
            cursor: 'pointer',
            borderRadius: 4,
            border: '1px solid #c0392b',
            background: '#fff',
            color: '#c0392b',
          }}
        >
          Reset all behaviors…
        </button>
      </div>
      <div
        style={{
          padding: '0.5rem',
          border: '1px solid #555',
          borderRadius: '0 4px 4px 4px',
          background: '#fff',
        }}
      >
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#555' }}>
          Drag blocks to define what the robot does when you press reset <strong>{selected}×</strong>.
          {stepsForSelected && stepsForSelected.length > 0 ? (
            <span> Currently: {stepsForSelected.length} block(s).</span>
          ) : (
            <span> Empty — nothing will happen until you add blocks.</span>
          )}
        </p>
        <BlocklyEditor key={selected} pressCount={selected} />
      </div>
    </div>
  );
}
