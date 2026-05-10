import { lazy, Suspense, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SimulatorView } from './components/SimulatorView';
import { LanguageToggle } from './components/LanguageToggle';

const EditorView = lazy(() =>
  import('./components/EditorView').then((m) => ({ default: m.EditorView })),
);
const BoardsPanel = lazy(() =>
  import('./components/BoardsPanel').then((m) => ({ default: m.BoardsPanel })),
);

type Mode = 'simulator' | 'editor' | 'boards';

const TAB_BUTTON_STYLE = (active: boolean): React.CSSProperties => ({
  padding: '0.4rem 0.9rem',
  cursor: 'pointer',
  borderRadius: 4,
  border: '1px solid #555',
  background: active ? '#2c5cff' : '#fff',
  color: active ? '#fff' : '#000',
  fontWeight: 'bold',
});

export default function App(): ReactElement {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('simulator');

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1rem' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: '1rem',
        }}
      >
        <h1 style={{ margin: 0 }}>{t('app.title')}</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div role="tablist" aria-label={t('mode.aria_group')} style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'simulator'}
              onClick={() => setMode('simulator')}
              style={TAB_BUTTON_STYLE(mode === 'simulator')}
            >
              {t('mode.simulator')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'editor'}
              onClick={() => setMode('editor')}
              style={TAB_BUTTON_STYLE(mode === 'editor')}
            >
              {t('mode.editor')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'boards'}
              onClick={() => setMode('boards')}
              style={TAB_BUTTON_STYLE(mode === 'boards')}
            >
              {t('boards.tab_label')}
            </button>
          </div>
          <LanguageToggle />
        </div>
      </header>
      {mode === 'simulator' && <SimulatorView />}
      <Suspense fallback={<div role="status" aria-live="polite" style={{ padding: 16 }}>…</div>}>
        {mode === 'editor' && <EditorView />}
        {mode === 'boards' && <BoardsPanel />}
      </Suspense>
    </main>
  );
}
