import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { BlocklyEditor } from '../editor/BlocklyEditor';
import { useEditorStore } from '../store/editor-store';
import { classProgramSample } from '../sim/behaviors/starter';
import { stepsToWorkspaceJson } from '../editor/codegen';
import { PressCountTabs } from './PressCountTabs';

export function EditorView(): ReactElement {
  const { t, i18n } = useTranslation();
  const selected = useEditorStore((s) => s.selectedPressCount);
  const resetAll = useEditorStore((s) => s.resetAll);
  const setBehavior = useEditorStore((s) => s.setBehavior);
  const programs = useEditorStore((s) => s.programs);
  const stepsForSelected = programs[selected];

  const totalConfiguredSlots = Object.values(programs).filter((s) => (s?.length ?? 0) > 0).length;
  const isEmpty = totalConfiguredSlots === 0;

  const handleResetAll = (): void => {
    if (window.confirm(t('editor.reset_confirm'))) {
      resetAll();
    }
  };

  const loadSampleProgram = (): void => {
    for (const entry of classProgramSample) {
      // Generate the matching Blockly JSON so the workspace renders the blocks
      // immediately on the next tab switch — without this, the workspace stays
      // blank even though programs[N] has steps.
      setBehavior(entry.pressCount, entry.steps, stepsToWorkspaceJson(entry.steps));
    }
  };

  const handleLoadSample = (): void => {
    if (!isEmpty && !window.confirm(t('editor.load_sample_confirm'))) return;
    loadSampleProgram();
  };

  const blocks = stepsForSelected?.length ?? 0;
  const instructions =
    blocks > 0
      ? t('editor.instructions_with_blocks', { count: selected, blocks })
      : t('editor.instructions_empty', { count: selected });

  return (
    <div style={{ padding: '0 1rem' }}>
      {isEmpty && (
        <div
          role="status"
          style={{
            margin: '0 0 0.75rem',
            padding: '0.75rem 1rem',
            background: '#e8f0ff',
            border: '1px solid #2c5cff',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: '0.95rem' }}>{t('editor.empty_banner')}</span>
          <button
            type="button"
            onClick={loadSampleProgram}
            style={{
              padding: '0.4rem 0.9rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              borderRadius: 4,
              border: '1px solid #2c5cff',
              background: '#2c5cff',
              color: '#fff',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            {t('editor.load_sample_now')}
          </button>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 0,
          gap: 8,
        }}
      >
        <PressCountTabs />
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={handleLoadSample}
            title={t('editor.load_sample_tooltip')}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.85rem',
              cursor: 'pointer',
              borderRadius: 4,
              border: '1px solid #2c5cff',
              background: '#fff',
              color: '#2c5cff',
            }}
          >
            {t('editor.load_sample')}
          </button>
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
