import type { ReactElement } from 'react';
import { useSimStore } from '../store/sim-store';
import { BoardCanvas } from './BoardCanvas';
import { PressButtons } from './PressButtons';

const formatElapsed = (startedAt: number | null): string => {
  if (startedAt === null) return '0.0s';
  const seconds = Math.max(0, (Date.now() - startedAt) / 1000);
  return `${seconds.toFixed(1)}s`;
};

export function SimulatorView(): ReactElement {
  const status = useSimStore((s) => s.status);
  const runStartedAt = useSimStore((s) => s.runStartedAt);
  const isStalled = useSimStore((s) => s.robot.isStalled);

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', padding: 24 }}>
      <div style={{ position: 'relative' }}>
        <BoardCanvas />
        {status === 'reached-goal' && (
          <div
            role="status"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.9)',
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#1a7a1a',
              borderRadius: 4,
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <span>Well done! 🎉</span>
            <span style={{ fontSize: '1rem', color: '#333' }}>
              Time: {formatElapsed(runStartedAt)}
            </span>
          </div>
        )}
        {isStalled && (
          <div
            data-testid="stall-indicator"
            role="alert"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: '#cc0000',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '0.85rem',
              fontWeight: 'bold',
            }}
          >
            Stalled — collision
          </div>
        )}
      </div>
      <PressButtons />
    </div>
  );
}
