# Browser-mode tests

Real-Chromium tests via [Vitest browser mode](https://vitest.dev/guide/browser/).
The unit suite (`src/**/*.test.tsx`, jsdom) and this suite share one runner —
`npm run test` runs both projects.

## Run

```
npm run test:browser           # run once, headless
npm run test:browser:watch     # watch mode, headed
npm run test                   # both projects
```

## Constraints (per docs/design/playwright-test-plan.md)

- **Windows + Chromium only**. Visual baselines (Phase 3+) are platform-specific.
  Cross-platform regen is a separate decision.
- **No `await page.waitForTimeout(N)`** — use `time.runSimSeconds(N)` for
  sim-driven waits or Playwright's `expect(...).toBeVisible({ timeout })` for
  DOM polls.
- **Window bridge** (`window.__scribbler`) is gated by `import.meta.env.MODE === 'test'`
  in `src/main.tsx`. Production builds tree-shake it.

## Layout

```
tests/browser/
├── helpers/
│   ├── store-bridge.ts   typed access to window.__scribbler
│   └── time.ts            sim-driven runSimSeconds(n)
├── smoke.spec.tsx         Phase 1 — golden path (5 tests)
└── README.md              this file
```
