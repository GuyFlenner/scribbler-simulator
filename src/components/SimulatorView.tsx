import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/sim-store';
import { BoardCanvas } from './BoardCanvas';
import { PressButtons } from './PressButtons';

const formatElapsedSeconds = (startedAt: number | null): string => {
  if (startedAt === null) return '0.0';
  const seconds = Math.max(0, (Date.now() - startedAt) / 1000);
  return seconds.toFixed(1);
};

export function SimulatorView(): ReactElement {
  const { t } = useTranslation();
  const status = useSimStore((s) => s.status);
  const runStartedAt = useSimStore((s) => s.runStartedAt);
  const isStalled = useSimStore((s) => s.robot.isStalled);
  const bonusHit = useSimStore((s) => s.bonusHit);

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
            <span>{bonusHit ? t('simulator.well_done_with_bonus') : t('simulator.well_done')}</span>
            <span style={{ fontSize: '1rem', color: '#333' }}>
              {t('simulator.time_label', { seconds: formatElapsedSeconds(runStartedAt) })}
            </span>
          </div>
        )}
        {status === 'running' && bonusHit && (
          <div
            data-testid="bonus-indicator"
            role="status"
            style={{
              position: 'absolute',
              top: 8,
              insetInlineEnd: 8,
              background: '#f1c40f',
              color: '#000',
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: '0.85rem',
              fontWeight: 'bold',
            }}
          >
            {t('simulator.bonus_collected')}
          </div>
        )}
        {isStalled && (
          <div
            data-testid="stall-indicator"
            role="alert"
            style={{
              position: 'absolute',
              top: 8,
              insetInlineStart: 8,
              background: '#cc0000',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '0.85rem',
              fontWeight: 'bold',
            }}
          >
            {t('simulator.stall')}
          </div>
        )}
      </div>
      <PressButtons />
    </div>
  );
}
