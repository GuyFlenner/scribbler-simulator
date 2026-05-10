import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SimulatorView } from './components/SimulatorView';
import { EditorView } from './components/EditorView';
import { LanguageToggle } from './components/LanguageToggle';

type Mode = 'simulator' | 'editor';

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
              style={{
                padding: '0.4rem 0.9rem',
                cursor: 'pointer',
                borderRadius: 4,
                border: '1px solid #555',
                background: mode === 'simulator' ? '#2c5cff' : '#fff',
                color: mode === 'simulator' ? '#fff' : '#000',
                fontWeight: 'bold',
              }}
            >
              {t('mode.simulator')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'editor'}
              onClick={() => setMode('editor')}
              style={{
                padding: '0.4rem 0.9rem',
                cursor: 'pointer',
                borderRadius: 4,
                border: '1px solid #555',
                background: mode === 'editor' ? '#2c5cff' : '#fff',
                color: mode === 'editor' ? '#fff' : '#000',
                fontWeight: 'bold',
              }}
            >
              {t('mode.editor')}
            </button>
          </div>
          <LanguageToggle />
        </div>
      </header>
      {mode === 'simulator' ? <SimulatorView /> : <EditorView />}
    </main>
  );
}
