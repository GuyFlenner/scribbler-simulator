import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** ★★☆-style star display for challenge scores (0-3). */
export function StarRow({
  stars,
  size = '1.1rem',
}: {
  stars: number;
  size?: string;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <span
      aria-label={t('challenges.stars_aria', { count: stars })}
      style={{ fontSize: size, letterSpacing: 2, color: '#d4a017' }}
    >
      {'★'.repeat(stars)}
      <span style={{ color: '#bbb' }}>{'★'.repeat(3 - stars)}</span>
    </span>
  );
}
