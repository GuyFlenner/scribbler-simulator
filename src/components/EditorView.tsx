import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { BlocklyEditor } from '../editor/BlocklyEditor';
import { useEditorStore } from '../store/editor-store';
import { PressCountTabs } from './PressCountTabs';

export function EditorView(): ReactElement {
  const { t, i18n } = useTranslation();
  const selected = useEditorStore((s) => s.selectedPressCount);
  const resetAll = useEditorStore((s) => s.resetAll);
  const programs = useEditorStore((s) => s.programs);
  const stepsForSelected = programs[selected];

  const handleResetAll = (): void => {
    if (window.confirm(t('editor.reset_confirm'))) {
      resetAll();
    }
  };

  const blocks = stepsForSelected?.length ?? 0;
  const instructions =
    blocks > 0
      ? t('editor.instructions_with_blocks', { count: selected, blocks })
      : t('editor.instructions_empty', { count: selected });

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
          {t('editor.reset_all')}
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
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#555' }}>{instructions}</p>
        <BlocklyEditor key={`${selected}-${i18n.language}`} pressCount={selected} />
      </div>
    </div>
  );
}
