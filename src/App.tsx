import type { ReactElement } from 'react';
import { SimulatorView } from './components/SimulatorView';

export default function App(): ReactElement {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '1rem' }}>
      <h1 style={{ margin: '0 0 1rem', textAlign: 'center' }}>Scribbler Simulator</h1>
      <SimulatorView />
    </main>
  );
}
