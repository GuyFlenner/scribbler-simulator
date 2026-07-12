import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { challengesForGrade, type Challenge } from '../challenges/catalog';
import { useChallengesStore } from '../store/challenges-store';
import { useGradeStore } from '../store/grade-store';
import { useBoardsStore } from '../store/boards-store';
import { useSimStore } from '../store/sim-store';
import { findBundledBoard } from '../sim/boards/default';
import { StarRow } from './StarRow';

interface Props {
  /** Called after a challenge is armed so the app can jump to the simulator. */
  onStartChallenge: () => void;
}

export function ChallengesPanel({ onStartChallenge }: Props): ReactElement {
  const { t } = useTranslation();
  const grade = useGradeStore((s) => s.grade);
  const starsByChallenge = useChallengesStore((s) => s.starsByChallenge);
  const activeChallengeId = useChallengesStore((s) => s.activeChallengeId);
  const startChallenge = useChallengesStore((s) => s.startChallenge);
  const challenges = challengesForGrade(grade);

  const handleStart = (challenge: Challenge): void => {
    const board = findBundledBoard(challenge.boardId);
    if (!board) return;
    startChallenge(challenge.id);
    useBoardsStore.getState().setActiveBoard(board.id);
    useSimStore.getState().setBoard(board);
    onStartChallenge();
  };

  return (
    <div style={{ padding: '0 1rem', maxWidth: 720 }}>
      <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>{t('challenges.list_heading')}</h2>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#666' }}>
        {t('challenges.list_hint')}
      </p>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {challenges.map((challenge, index) => {
          const stars = starsByChallenge[challenge.id] ?? 0;
          const isActive = challenge.id === activeChallengeId;
          return (
            <li
              key={challenge.id}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: 6,
                border: isActive ? '2px solid #2c5cff' : '1px solid #aaa',
                background: isActive ? '#e8f0ff' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                  {index + 1}. {t(challenge.titleKey)}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#555' }}>{t(challenge.descKey)}</span>
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StarRow stars={stars} />
                <button
                  type="button"
                  onClick={() => handleStart(challenge)}
                  style={{
                    padding: '0.3rem 0.8rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    borderRadius: 4,
                    border: '1px solid #2c5cff',
                    background: isActive ? '#fff' : '#2c5cff',
                    color: isActive ? '#2c5cff' : '#fff',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isActive ? t('challenges.retry') : t('challenges.start')}
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
