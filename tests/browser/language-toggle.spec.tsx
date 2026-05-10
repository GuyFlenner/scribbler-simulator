import { describe, it, expect, beforeEach } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-react';
import App from '../../src/App';
import { storeBridge } from './helpers/store-bridge';
import { i18nHelper } from './helpers/i18n';

describe('language toggle', () => {
  beforeEach(async () => {
    await storeBridge.resetAll();
    render(<App />);
  });

  it('clicking עברית flips html dir to rtl and translates the title', async () => {
    expect(i18nHelper.currentDir()).toBe('ltr');
    await expect.element(page.getByRole('heading', { name: /scribbler simulator/i })).toBeVisible();

    await page.getByRole('button', { name: /^עברית$/ }).click();

    expect(i18nHelper.currentDir()).toBe('rtl');
    expect(i18nHelper.currentLang()).toBe('he');
    await expect.element(page.getByRole('heading', { name: /סקריבלר/i })).toBeVisible();
  });

  it('language choice is written to the versioned localStorage key', async () => {
    expect(localStorage.getItem('scribbler-sim:lang:v1')).toBeNull();

    await page.getByRole('button', { name: /^עברית$/ }).click();
    expect(localStorage.getItem('scribbler-sim:lang:v1')).toBe('he');

    await page.getByRole('button', { name: /^english$/i }).click();
    expect(localStorage.getItem('scribbler-sim:lang:v1')).toBe('en');
  });

  it('Hebrew translates Press button labels, Reset board, and the cheat-sheet button', async () => {
    await page.getByRole('button', { name: /^עברית$/ }).click();

    // Press-2 specifically (avoid strict-mode collision with the other 6 press buttons).
    // Aria-label has invisible LRM markers around numerals; .* matches them.
    await expect.element(page.getByLabelText(/לחיצה.*Reset.*2.*פעמים/)).toBeVisible();
    await expect.element(page.getByRole('button', { name: /אפס לוח/ })).toBeVisible();
    await expect.element(page.getByRole('button', { name: /הדפס דף עזר/ })).toBeVisible();
  });
});
