import { storeBridge } from './store-bridge';

export const i18nHelper = {
  async switchTo(lang: 'en' | 'he'): Promise<void> {
    await storeBridge.i18n().changeLanguage(lang);
  },

  currentDir(): 'ltr' | 'rtl' {
    return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
  },

  currentLang(): string {
    return storeBridge.i18n().language;
  },
};
