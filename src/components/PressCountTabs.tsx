import type { ReactElement } from 'react';
import { PRESS_COUNTS, useEditorStore } from '../store/editor-store';

export function PressCountTabs(): ReactElement {
  const selected = useEditorStore((s) => s.selectedPressCount);
  const select = useEditorStore((s) => s.selectPressCount);
  const programs = useEditorStore((s) => s.programs);

  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {PRESS_COUNTS.map((n) => {
        const hasSteps = (programs[n]?.length ?? 0) > 0;
        const isActive = selected === n;
        return (
          <button
            key={n}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Edit press ${n} times`}
            onClick={() => select(n)}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              border: '1px solid #555',
              borderBottom: isActive ? '1px solid #fff' : '1px solid #555',
              background: isActive ? '#fff' : '#e8e8e8',
              fontWeight: isActive ? 'bold' : 'normal',
            }}
          >
            Press {n}× {hasSteps ? '●' : ''}
          </button>
        );
      })}
    </div>
  );
}
