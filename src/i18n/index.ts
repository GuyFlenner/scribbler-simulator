import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';

export const SUPPORTED_LANGUAGES = ['en', 'he'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const isRtlLanguage = (lang: string): boolean => lang.startsWith('he');

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'scribbler-sim:lang:v1',
      caches: ['localStorage'],
    },
  });

const applyDirection = (lang: string): void => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang.startsWith('he') ? 'he' : 'en';
    document.documentElement.dir = isRtlLanguage(lang) ? 'rtl' : 'ltr';
  }
};

applyDirection(i18n.language);
i18n.on('languageChanged', applyDirection);

export default i18n;
