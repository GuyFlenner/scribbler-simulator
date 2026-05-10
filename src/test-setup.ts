import '@testing-library/jest-dom';
import i18n from './i18n';

void i18n.changeLanguage('en');

if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as HTMLCanvasElement['getContext'];
}
