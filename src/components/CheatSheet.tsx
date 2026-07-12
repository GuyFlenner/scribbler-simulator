import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { Step } from '../sim/behaviors/schema';
import { useEditorStore, PRESS_COUNTS } from '../store/editor-store';

const describeStep = (step: Step, t: TFunction): string => {
  switch (step.kind) {
    case 'drive':
      return step.cm >= 0
        ? t('cheatsheet.step_drive_forward', { cm: step.cm })
        : t('cheatsheet.step_drive_backward', { cm: -step.cm });
    case 'drive_wheels':
      return t('cheatsheet.step_drive_wheels', {
        left: step.leftSpeedPct,
        right: step.rightSpeedPct,
        ms: step.durationMs,
      });
    case 'drive_arc':
      if (step.radiusCm === 0) {
        return t('cheatsheet.step_drive_arc_spin', { degrees: step.degrees });
      }
      return step.degrees >= 0
        ? t('cheatsheet.step_drive_arc_right', { radius: step.radiusCm, degrees: step.degrees })
        : t('cheatsheet.step_drive_arc_left', {
            radius: step.radiusCm,
            degrees: -step.degrees,
          });
    case 'rotate':
      return step.degrees >= 0
        ? t('cheatsheet.step_rotate_right', { degrees: step.degrees })
        : t('cheatsheet.step_rotate_left', { degrees: -step.degrees });
    case 'stop':
      return t('cheatsheet.step_stop');
    case 'beep':
      return t('cheatsheet.step_beep', { ms: step.durationMs });
    case 'wait':
      return t('cheatsheet.step_wait', { seconds: step.seconds });
    case 'repeat':
      return t('cheatsheet.step_repeat', { times: step.times });
    case 'if':
      return t('cheatsheet.step_if');
    case 'while':
      return t('cheatsheet.step_while');
  }
};

const describeBehavior = (steps: Step[] | undefined, t: TFunction): string => {
  if (steps && steps.length > 0) {
    return steps.map((s) => describeStep(s, t)).join('  →  ');
  }
  return '';
};

interface Props {
  onClose: () => void;
}

export function CheatSheet({ onClose }: Props): ReactElement {
  const { t } = useTranslation();
  const programs = useEditorStore((s) => s.programs);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('cheatsheet.title')}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#fff',
        zIndex: 1000,
        overflow: 'auto',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header
        className="cheatsheet-controls"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.6rem' }}>{t('cheatsheet.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
              borderRadius: 4,
              border: '1px solid #2c5cff',
              background: '#2c5cff',
              color: '#fff',
              fontWeight: 'bold',
            }}
          >
            {t('cheatsheet.print')}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              cursor: 'pointer',
              borderRadius: 4,
              border: '1px solid #555',
              background: '#fff',
            }}
          >
            {t('cheatsheet.close')}
          </button>
        </div>
      </header>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '1.2rem',
        }}
      >
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th
              style={{
                padding: '0.6rem 1rem',
                borderBottom: '2px solid #333',
                textAlign: 'start',
                width: '20%',
              }}
            >
              {t('cheatsheet.press_column')}
            </th>
            <th
              style={{ padding: '0.6rem 1rem', borderBottom: '2px solid #333', textAlign: 'start' }}
            >
              {t('cheatsheet.description_column')}
            </th>
          </tr>
        </thead>
        <tbody>
          {PRESS_COUNTS.map((n) => {
            const userSteps = programs[n];
            const description =
              userSteps && userSteps.length > 0
                ? describeBehavior(userSteps, t)
                : t('cheatsheet.empty_row');
            const isEmpty = !userSteps?.length;
            return (
              <tr key={n} style={{ borderBottom: '1px solid #ccc' }}>
                <td
                  style={{
                    padding: '0.8rem 1rem',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    verticalAlign: 'top',
                  }}
                >
                  {n}×
                </td>
                <td style={{ padding: '0.8rem 1rem', color: isEmpty ? '#888' : '#000' }}>
                  {description}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <footer
        style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid #ccc',
          fontSize: '0.95rem',
          color: '#555',
        }}
      >
        {t('cheatsheet.footer')}
      </footer>

      <style>{`
        @media print {
          .cheatsheet-controls { display: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
