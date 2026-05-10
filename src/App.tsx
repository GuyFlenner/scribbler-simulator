import { useState, type ReactElement } from 'react';
import { SimulatorView } from './components/SimulatorView';
import { EditorView } from './components/EditorView';

type Mode = 'simulator' | 'editor';

export default function App(): ReactElement {
  const [mode, setMode] = useState<Mode>('simulator');

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1rem' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <h1 style={{ margin: 0 }}>Scribbler Simulator</h1>
        <div role="tablist" aria-label="Mode" style={{ display: 'flex', gap: 4 }}>
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
            Simulator
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
            Edit behaviors
          </button>
        </div>
      </header>
      {mode === 'simulator' ? <SimulatorView /> : <EditorView />}
    </main>
  );
}
