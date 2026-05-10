import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

const LANGS = ['en', 'he'] as const;

export function LanguageToggle(): ReactElement {
  const { t, i18n } = useTranslation();
  const current = i18n.language.startsWith('he') ? 'he' : 'en';

  return (
    <div role="group" aria-label={t('language.switch_aria')} style={{ display: 'flex', gap: 4 }}>
      {LANGS.map((lng) => {
        const active = current === lng;
        const label = lng === 'en' ? t('language.english') : t('language.hebrew');
        return (
          <button
            key={lng}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (i18n.language !== lng) void i18n.changeLanguage(lng);
            }}
            style={{
              padding: '0.3rem 0.7rem',
              cursor: 'pointer',
              borderRadius: 4,
              border: '1px solid #555',
              background: active ? '#2c5cff' : '#fff',
              color: active ? '#fff' : '#000',
              fontSize: '0.85rem',
              fontWeight: active ? 'bold' : 'normal',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
