/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173 },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: './src/test-setup.ts',
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          globals: true,
          include: ['tests/browser/**/*.spec.{ts,tsx}'],
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [{ browser: 'chromium' }],
            // Failure screenshots are transient CI/debug artifacts — keep them out of
            // tests/browser/__screenshots__/, which holds committed baselines only.
            screenshotDirectory: 'test-results/screenshots',
          },
        },
      },
    ],
  },
});
