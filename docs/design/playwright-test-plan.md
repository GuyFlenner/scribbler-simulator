# Design: Browser-based UI test plan (Playwright vs Vitest browser mode)

**Tier**: 3 (planning only — no code changes in this pass)
**Status**: Proposal — 2026-05-10
**Source request**: "scribbler-simulator has 85 unit/integration tests in jsdom. Across all 5 backlog items I shipped, every commit ended with the same caveat: 'DOM-level assertions pass but visual fidelity needs a manual browser smoke-test'. The user wants to close that gap with a real-browser test layer so future SDLC runs can declare features done autonomously instead of requiring the user to walk through the app in a browser."
**Related**: `docs/design/simulator-architecture.md`, `docs/status.md`

---

## TL;DR — recommendation

Adopt **Vitest browser mode with the Playwright provider** as the primary new test layer, not standalone Playwright Test. Reasoning is in [§ Tool choice](#tool-choice) below; the short version is that the project already runs Vitest, all 85 existing tests stay where they are, the browser layer reuses the same `vite.config.ts` / fixtures / store imports, and we keep one test runner instead of two. Playwright's only feature edge — first-class `toHaveScreenshot()` for the canvas — is matched by Vitest browser mode's `toMatchScreenshot()` (mature in Vitest 2.x+, currently 3.2 in this repo). For the 1-2 cases where a true cross-tab / cross-page-reload flow is needed, a **thin Playwright Test island** can be added later under `tests/playwright-e2e/`; the plan budgets for it but does not require it for Phase 1.

The phrase "Playwright" in this doc therefore mostly means "Playwright the browser engine, driving Vitest browser mode." The few sections that need standalone Playwright Test are flagged.

---

## What changes

### New deps (versions current as of 2026-05)

```jsonc
// devDependencies — proposed, NOT installed in this pass
"@vitest/browser": "^3.2.4",          // matches existing vitest 3.2.4
"@vitest/browser-playwright": "^3.2.4",
"playwright": "^1.49.0",              // browser runtime only
"vitest-browser-react": "^0.2.0"      // render() helper for React 19
```

Optional, only if a true E2E island is needed in Phase 4:

```jsonc
"@playwright/test": "^1.49.0"         // standalone test runner
```

No production deps change. Bundle size is unaffected.

### New folders

```
tests/
├── browser/                                  ← Vitest browser-mode tests
│   ├── fixtures/
│   │   ├── boards.ts                         ← Pre-built BoardState fixtures for tests
│   │   ├── programs.ts                       ← Pre-built Step[] fixtures
│   │   ├── runs.ts                           ← Pre-built RunRecord fixtures
│   │   └── localstorage.ts                   ← Helpers: seedLang(), seedPrograms(), seedBoards()
│   ├── helpers/
│   │   ├── store-bridge.ts                   ← Typed access to window.__simStore (test mode only)
│   │   ├── canvas.ts                         ← samplePixel(), assertPixelMatches(), waitForFrame()
│   │   ├── blockly.ts                        ← Workspace JSON inject + assert helpers
│   │   ├── time.ts                           ← stepFrames(n), runUntil(predicate, maxFrames)
│   │   └── i18n.ts                           ← switchTo('he'), switchTo('en'), assertDir()
│   ├── smoke.spec.ts                         ← Phase 1 — 5 golden-path tests
│   ├── simulator-canvas.spec.ts              ← Phase 3
│   ├── editor-blockly.spec.ts                ← Phase 2
│   ├── boards-editor.spec.ts                 ← Phase 2
│   ├── language-toggle.spec.ts               ← Phase 2
│   └── persistence.spec.ts                   ← Phase 2
└── playwright-e2e/                           ← OPTIONAL Phase 4 island; see § Migration plan
    └── README.md                             ← "only add tests here that need true page reload"

screenshots/                                  ← Visual baselines, committed
└── chromium-win32/                           ← One folder per (browser × OS) combo
    ├── simulator-default-board.png
    ├── simulator-mid-run-press2.png
    ├── editor-empty.png
    ├── editor-with-drive-block.png
    └── boards-panel-default.png
```

### Source-side hooks (one small, gated change in Phase 1)

The plan needs **one** real source change before any browser tests can run: a test-mode-only window bridge so tests can inspect store state without scraping the canvas. This goes in `src/main.tsx`:

```typescript
// src/main.tsx — Phase 1 source change (gated behind import.meta.env)
if (import.meta.env.MODE === 'test' || import.meta.env.VITE_E2E === '1') {
  // Tests can read robot state, advance the sim, seed programs, etc.
  // Production builds strip this entirely (Vite tree-shakes the dead branch).
  (window as Window & { __scribbler?: unknown }).__scribbler = {
    simStore: useSimStore,
    editorStore: useEditorStore,
    boardsStore: useBoardsStore,
    i18n,
  };
}
```

Discussion in [§ Source-side hooks: pros and cons](#source-side-hooks-pros-and-cons).

### CI hook (local-only, no remote yet)

`package.json` scripts (proposed; not added in this pass):

```jsonc
"test:browser": "vitest --project=browser run",
"test:browser:watch": "vitest --project=browser",
"test:browser:update": "vitest --project=browser run --update",
"test:all": "vitest run"  // existing behaviour: runs both jsdom + browser projects
```

`vitest.config.ts` becomes a workspace:

```typescript
// proposed shape — actual file is rewritten in Phase 1
export default defineConfig({
  test: {
    projects: [
      { name: 'unit', environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'] },
      {
        name: 'browser',
        include: ['tests/browser/**/*.spec.{ts,tsx}'],
        browser: {
          enabled: true,
          provider: 'playwright',
          headless: true,
          instances: [{ browser: 'chromium' }],
        },
      },
    ],
  },
});
```

Per CLAUDE.md: no remote, no GitHub Actions. The "CI" gate is `npm run test:all` on the developer's laptop. This must pass before Phase 8 (commit to main).

---

## Why

### The autonomous gap (verbatim from `docs/status.md`)

> "Browser smoke-test by the user — code-level gates have been the only quality signal across all 5 items; visual fidelity needs human eyes"

Each of the 5 items shipped with one or more of these caveats:

| Item                  | Caveat                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — MVP sim core      | "Manual: load board with 20 obstacles, run for 60s, observe DevTools shows fps stays >50" — never automated                                            |
| 2 — Block editor      | "Blockly in jsdom: real workspace mounting is exercised by the mode-toggle test only. Block-drag-and-drop interactions are not unit-testable in jsdom" |
| 3 — Sensor sim        | No visual gate that sensor-driven behaviour produces the expected motion arc on the canvas                                                             |
| 4 — Bilingual UI      | RTL layout, Hebrew font rendering, Blockly's `msg/he` injection — none verified visually                                                               |
| 5 — Practice features | "Pragmatic editor (palette + click-to-place + property panel)" — interaction never tested, only the resulting `BoardState`                             |

### What Playwright/Vitest-browser would close

1. **Canvas rendering correctness**: robot draws at the right place, A/B markers visible, obstacle colours, stall indicator
2. **Blockly workspace**: blocks render, can be dragged from toolbox, generate the expected `Step[]`
3. **RTL/Hebrew**: actual `dir=rtl` flips layout; Hebrew strings don't overflow; numerals render correctly
4. **localStorage round-trips through a real reload** (jsdom's `localStorage` is in-memory per test; a real browser reload exposes hydration bugs)
5. **Cross-component integration through the actual rAF loop**: the `BoardCanvas` rAF loop, the Zustand subscription, and the React render cycle interact in jsdom only via fake timers
6. **Lazy-loaded chunks** (`EditorView`, `BoardsPanel` are `React.lazy`): jsdom tests force-load them; only a real browser test exercises the suspense boundary

### What it will NOT close (be honest)

These remain HITL items the project owner has to eyeball:

1. **"Is this Hebrew text rendering nicely for a kid"** — font choice, line-height, kerning. Screenshot diff catches regressions, not first-pass aesthetics.
2. **Animation feel** — does the robot motion feel right at 60Hz, is there visible stutter, is the friction tuned. Pixel-perfect screenshots can't tell you the robot moves _too fast_ or _too slow_ if both states draw correctly per frame.
3. **Sound** — `beep` step plays through the AudioContext; we can assert AudioContext was poked but not that it's audibly correct.
4. **Real-S3 fidelity** — speed/acceleration calibration vs the actual robot. This is documented as out-of-scope until a robot is available.
5. **Mobile/tablet ergonomics** — viewport-specific tests add complexity; not in scope for Phase 1-3.
6. **Subjective "kid-friendliness"** — colour contrast, button hit areas for an 8-year-old. Captured in screenshots so regressions are visible, but the first review is human.

---

## Tool choice

### Considered options

| Option                                                        | Pros                                                                                                                                                                                            | Cons                                                                                                                                                                                    |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Vitest browser mode + Playwright provider**              | Same runner, same config, same `i18n`/store imports as unit tests. `toMatchScreenshot()` mature in Vitest 3.x. Tree-shakes test-mode hooks at build time. One `npm test:all` covers everything. | Less mature ecosystem of plugins than Playwright Test. Visual-regression docs newer (~2025).                                                                                            |
| **B. Playwright Test (standalone) + the existing dev server** | Largest community, richest debugging (trace viewer, codegen, UI mode). Best-in-class `toHaveScreenshot()`.                                                                                      | Second test runner. Second config. Tests live in their own world — can't import the `useSimStore` directly, must script through `window`. Encourages duplicate fixtures.                |
| **C. Playwright component testing**                           | Real browser per component                                                                                                                                                                      | Marked "experimental" in Playwright docs. React 19 + Blockly + Zustand mounting story is unproven; many community gotchas. Component CT for an SPA is a worse fit than full-page tests. |
| **D. Cypress**                                                | Familiar, good DX                                                                                                                                                                               | Two engines (its own + Chromium). Slower, more flake than Playwright in 2026 benchmarks. No advantage for a no-backend SPA.                                                             |
| **E. Stay jsdom-only, accept the manual gate**                | Zero churn                                                                                                                                                                                      | Doesn't close the autonomous-gap that is the whole point of this plan.                                                                                                                  |

### Recommendation: **A — Vitest browser mode**, with **B as a reserve** for true E2E flows

The qa-automation (Java) repo is a useful pattern source for _test architecture_ (page object split, `WaitUtils` named timeouts, screenshot-on-failure as Allure attachments — see [§ Patterns from qa-automation](#patterns-from-qa-automation)). It is not a fit for stack choice. That repo tests an authenticated multi-page Salesforce app across browsers; scribbler-simulator is a single-page no-auth no-backend kid's tool.

The hard tipping factor: the existing 85 tests already use `useSimStore.getState()` + `act()` + RTL `screen.getByLabelText()` — this idiom continues to work in Vitest browser mode (via `vitest-browser-react`), but would require a complete rewrite under standalone Playwright Test. Migration cost favours A.

If a flow requires a true page reload (e.g. "set lang to Hebrew, reload, assert it stuck"), Vitest browser mode handles it via `page.reload()` already — Playwright Test doesn't add anything. The reserve clause for B applies only to tests that need _multiple tabs_ or genuine cross-origin behaviour, neither of which exists in this product.

---

## Coverage map (gap analysis)

Priority key: **Must** = needed before Phase 1 sign-off. **Should** = Phase 2. **Could** = Phase 3+. **Won't** = explicitly out of scope.

| Feature area                | jsdom now tests                                | Only a browser can verify                                                                   | Proposed browser test                                                                  | Priority              |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------- |
| Press-button → robot moves  | Store mutation, label-by-aria                  | Canvas actually redraws at new robot position                                               | `simulator-canvas.spec.ts::press2-moves-robot` (sample pixel at expected end position) | Must                  |
| Reset board                 | Store reset to initial pose                    | Canvas A marker rendered, robot back at A pixel-wise                                        | `simulator-canvas.spec.ts::reset-returns-to-A`                                         | Must                  |
| Goal overlay                | Text "well done" in DOM                        | Overlay actually visible on top of canvas, not z-index'd off-screen                         | `simulator-canvas.spec.ts::goal-overlay-visible`                                       | Must                  |
| Stall indicator             | `data-testid` present in DOM                   | Canvas robot turns red on stall (visual cue)                                                | `simulator-canvas.spec.ts::stall-tints-robot-red`                                      | Should                |
| Editor mount                | Editor view's tab strip renders                | Blockly SVG workspace actually injects, toolbox visible                                     | `editor-blockly.spec.ts::editor-mounts-blockly`                                        | Must                  |
| Block drag → Step[]         | Codegen tested with hand-built JSON fixtures   | Real `mousedown`/`mousemove`/`mouseup` from toolbox onto workspace produces the same Step[] | `editor-blockly.spec.ts::drag-drive-block-compiles`                                    | Should                |
| Editor persistence          | localStorage round-trip in jsdom               | Real reload re-hydrates programs, Blockly workspace re-renders                              | `persistence.spec.ts::programs-survive-reload`                                         | Should                |
| Bilingual toggle (text)     | `screen.getByRole('heading', name: /סקריבלר/)` | Hebrew strings actually render in the correct font, not as `???`                            | `language-toggle.spec.ts::hebrew-strings-render`                                       | Should                |
| RTL flip                    | `document.documentElement.dir === 'rtl'`       | Layout actually mirrors — header right-aligned, button order flipped                        | `language-toggle.spec.ts::rtl-mirrors-header` (screenshot)                             | Should                |
| Blockly Hebrew msgs         | None — opaque inside Blockly                   | Blockly toolbox renders RTL with `msg/he` strings                                           | `editor-blockly.spec.ts::blockly-hebrew-toolbox` (screenshot)                          | Could                 |
| Boards panel                | List items in DOM                              | Panel renders; "Edit" / "Delete" buttons clickable; new board persists                      | `boards-editor.spec.ts::create-edit-save-board`                                        | Should                |
| Board editor click-to-place | Tested by simulating `click()` events          | Real coordinate math (`getBoundingClientRect`) gives same result                            | `boards-editor.spec.ts::click-places-obstacle-at-cursor`                               | Should                |
| Run history                 | Store CRUD                                     | Run list actually populates after a sim run; replay button click triggers replay            | `simulator-canvas.spec.ts::run-history-after-goal`                                     | Should                |
| Lazy-loaded chunks          | Forced-loaded in jsdom                         | Real Suspense fallback "..." shows, then chunk arrives, then editor mounts                  | `smoke.spec.ts::editor-tab-shows-suspense`                                             | Could                 |
| Animation perf              | None                                           | 60fps sustained over a 30s run                                                              | Skip — see [§ What we explicitly do NOT test](#what-we-explicitly-do-not-test)         | Won't                 |
| Mobile viewport             | None                                           | Tablet layout doesn't break                                                                 | Skip until post-competition                                                            | Won't                 |
| Cross-browser               | None                                           | Firefox/Webkit don't crash                                                                  | Skip — chromium-only Phase 1-3, see Phase 4                                            | Won't (until Phase 4) |

Total Must = 4. Should = 8. Could = 2. Won't = 3.

---

## Architecture

### Test runner setup

Single Vitest config with two **projects** (Vitest's term for what other tools call "workspaces" or "sub-suites"). Existing `unit` project is the current 85 tests, unchanged. New `browser` project runs Vitest browser mode under chromium via the Playwright provider.

```
npm run test          → both projects, headless         (default; what the SDLC pipeline runs)
npm run test:browser  → only the browser project
npm run test:browser:update → updates screenshot baselines (manual gate)
```

Run order: `unit` first, then `browser`. Browser tests are slower, no point running them if a unit gate already broke.

### Page object model OR test-helper functions — pick one

**Pick: typed test-helper functions, not page objects**, with a thin "screen" wrapper around `vitest-browser-react`'s built-in locators.

Rationale:

- The qa-automation repo's POM (Page Object Model) split into `Locators` / `Actions` / `Flows` / `Bible` is sized for a 50-page Salesforce org with thousands of tests. scribbler-simulator has ~5 visible "screens" (simulator, editor, boards panel, board editor modal, language toggle) and will probably grow to ~10 over the project's life. A POM here is over-engineered.
- The helper functions sit one level above the locators, exactly the same shape as qa-automation's `LoginFlows::QA_T7_login_happy_flow` — composed from atomic actions — but expressed as plain TS functions instead of a Java class. That preserves the _idiom_ the qa-automation repo proves works, without dragging in the ceremony.

Skeleton of a helper:

```typescript
// tests/browser/helpers/simulator.ts
import { page, userEvent } from '@vitest/browser/context';
import { storeBridge } from './store-bridge';

export const simulator = {
  // ── Actions ──
  async pressReset(n: number): Promise<void> {
    await page.getByLabelText(`press reset ${n} times`).click();
  },
  async resetBoard(): Promise<void> {
    await page.getByRole('button', { name: /reset board/i }).click();
  },
  // ── Assertions ──
  async assertRobotAt(x: number, y: number, tolM = 0.02): Promise<void> {
    const robot = await storeBridge.simStore().robot;
    if (Math.abs(robot.x - x) > tolM) throw new Error(`x=${robot.x} not within ${tolM} of ${x}`);
    if (Math.abs(robot.y - y) > tolM) throw new Error(`y=${robot.y} not within ${tolM} of ${y}`);
  },
  // ── Time control ──
  async runUntilGoal(maxFrames = 1200): Promise<void> {
    await time.runUntil(() => storeBridge.simStore().status === 'reached-goal', maxFrames);
  },
};
```

This keeps the qa-automation `Bible` ergonomics (one verb-noun method = one `@Step`-style action; flows compose actions; assertions co-located) without inheriting the Java-class overhead.

### How tests interact with the running app

**Hybrid: black-box for user-visible behaviour, store-bridge for time/state inspection.**

- **Clicks and assertions on labels/headings/buttons** go through `vitest-browser-react`'s `page.getByRole` etc. — same vocabulary as RTL.
- **State inspection (robot position, store status, current programs)** goes through `window.__scribbler.simStore.getState()` exposed in test mode (see [Source-side hooks](#source-side-hooks-pros-and-cons)).
- **Time advancement** uses `page.clock.install()` + manual `clock.runFor()`, **not** real wall-clock waiting. The rAF loop in `BoardCanvas` becomes deterministic.
- **Screenshot assertions** for canvas regions only — never for textual UI (text changes too often).

This split mirrors the qa-automation repo's `WaitUtils.isVisibleFast` vs `validateXyzLoaded` vs `assertThat` distinction: short fast checks for transient state, semantic assertions for steady state, raw inspection only when needed.

### Visual regression strategy for the canvas

**Layered approach:**

1. **Layer 1 — pixel sampling at known coordinates** (preferred for invariants):

   ```typescript
   // canvas at goal position (~0.92m × 0.92m on default 1m × 1m board → pixel 460, 460)
   const pixel = await canvas.samplePixel(460, 460);
   expect(pixel.r).toBeGreaterThan(180); // red B-marker
   expect(pixel.r).toBeGreaterThan(pixel.g + 80);
   ```

   No baseline file. Resilient to font tweaks, theme changes. Use for _correctness_ assertions (the marker is where it should be, the robot turned red on stall, etc.).

2. **Layer 2 — `toMatchScreenshot()` for whole-canvas baselines** (regression net):

   ```typescript
   await expect(page.getByRole('img', { name: /board/i })).toMatchScreenshot('default-board-empty');
   ```

   File committed as `screenshots/chromium-win32/default-board-empty.png`. **Baselines are platform-pinned** — only re-generated on the project owner's Windows laptop, where the kid runs the sim. Cross-OS variance is documented as out-of-scope.

3. **Layer 3 — DOM-level overlays** (already passing, don't break):
   The "well done" overlay, stall indicator, and goal markers are rendered as DOM elements over the canvas. Existing `getByText(/well done/)` style assertions stay. They don't need a screenshot.

**Baseline update policy:**

- Baselines live in `screenshots/<browser>-<os>/`, tracked in git.
- Updates require **explicit operator action**: `npm run test:browser:update` is a manual command, never invoked by the SDLC pipeline.
- Each baseline file is small (<50 KB PNG); 10-15 baselines total.
- A regression in a screenshot test is a **HITL item** — the SDLC pipeline reports it but does not auto-update.

### Blockly drag handling strategy

Blockly is the hardest surface. The plan uses **three escalating strategies**, picking the cheapest that suffices per test:

1. **Workspace JSON injection** (preferred for codegen verification): seed the workspace via `Blockly.serialization.workspaces.load()` from a JSON fixture, then assert the `editorStore.programs[N]` matches expectations. Bypasses drag entirely.

   ```typescript
   await blockly.loadWorkspaceJson(2, fixtures.driveBlockJson);
   expect(storeBridge.editorStore().programs[2]).toEqual([{ kind: 'drive', cm: 30 }]);
   ```

   This covers ~80% of editor tests and stays robust against Blockly version bumps.

2. **Coordinate-based mouse events** (for actual drag-and-drop verification): use `page.mouse.move/down/up` over Blockly's SVG, with selectors derived from Blockly's `data-id` attributes which are stable. Used sparingly — one or two tests max.

3. **Workspace JSON snapshot**: after a drag, `Blockly.serialization.workspaces.save(ws)` returns the post-drag JSON; assert structure not pixels.

Pattern not used: `nisheed2440/blockly-playwright`. That project is Blockly-blocks-as-test-DSL, not "test Blockly with Playwright" — wrong direction.

### i18n + RTL coverage strategy

Two distinct concerns:

1. **String parity** — already covered by `src/i18n/keys.test.ts` (jsdom). No new browser test needed.
2. **Visual layout under RTL** — new browser tests:
   - `language-toggle.spec.ts::switches-html-dir` — `expect(document.documentElement).toHaveAttribute('dir', 'rtl')` after Hebrew toggle.
   - `language-toggle.spec.ts::hebrew-text-renders-in-buttons` — read `getByRole('button', { name: /אפס לוח/ })` from the actual rendered page (not just `screen` like jsdom).
   - `language-toggle.spec.ts::rtl-mirrors-header-layout` — screenshot of the header in EN vs HE, asserting they're mirror images. _This is the only screenshot test that's worth having two baselines (one per locale)._
   - `editor-blockly.spec.ts::blockly-hebrew-toolbox` — screenshot of the toolbox after switching to Hebrew, confirming Blockly's `msg/he` actually loaded.

### Determinism strategy (rAF, timers, animations)

Three hand-offs in the rendering pipeline that have to be controlled:

| Source                                   | Production behaviour                    | Test mode                                                                                                                                        |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `requestAnimationFrame` in `BoardCanvas` | Browser-driven, ~60fps, real wall-clock | `page.clock.install()` overrides rAF. Tests advance with `page.clock.runFor(ms)` to step exactly N frames.                                       |
| `Date.now()` for `runStartedAt`          | Wall clock                              | `page.clock.setSystemTime(<fixed>)` so run records are deterministic                                                                             |
| CSS animations (e.g. fade-in)            | Real                                    | Vitest browser mode disables animations during `toMatchScreenshot` by default; explicit opt-out only if a test wants to verify an animation runs |

The current code already accommodates this — `tick(dtSeconds)` is parameterized, so `runFor(ms)` translates to a known number of `dt = 1/60` ticks. No source change needed beyond the window bridge.

**Implementation rule**: every browser test starts with `await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })`. Tests that explicitly want real time (e.g. one perf smoke test) opt in via a helper.

### Source-side hooks: pros and cons

**Decision: expose `window.__scribbler` in test mode only.**

Pro:

- Test code can read `useSimStore.getState().robot` directly — no DOM-reverse-engineering, no scraping the canvas.
- Identical to how the existing 85 unit tests work (`useSimStore.getState()` is _the_ test API). Migration is mechanical.
- Compile-time stripped: `if (import.meta.env.MODE === 'test')` is a constant in production, Vite/Rollup's tree-shake removes the entire branch.

Con:

- A future security review might flag "leaks app internals to the global object." Mitigation: the bridge is gated behind `import.meta.env.MODE === 'test'` AND `import.meta.env.VITE_E2E === '1'`, both of which are inert in the production build.
- Tests become tightly coupled to store shape. Mitigation: same coupling already exists in the 85 unit tests; this isn't a new tax.

Pure black-box would force every assertion through the canvas (pixel sampling) or the DOM (slower, brittle for canvas-rendered state). The trade-off favours the bridge.

---

## Test inventory (top 20, prioritised)

Format: name → what it verifies → mechanism → expected runtime → priority

### Phase 1 — smoke (the golden path, must-pass before any merge)

1. **`smoke::app-mounts-and-renders-title`** — page loads, title visible — `page.getByRole('heading')` — ~1s — Must
2. **`smoke::press-2x-moves-robot`** — click press-2 button → store status becomes 'running' → after `clock.runFor(2000)`, robot.x ≈ 0.30 — store-bridge — ~2s — Must
3. **`smoke::reset-board-returns-to-A`** — drive forward, click reset, robot back at start — store-bridge — ~2s — Must
4. **`smoke::goal-overlay-on-reach`** — seed robot at goal, click any press, after one tick "well done" visible — DOM — ~2s — Must
5. **`smoke::editor-tab-shows-blockly-workspace`** — click Edit Behaviors tab → Suspense fallback → workspace SVG attached to DOM — DOM + SVG selector — ~3s — Must

### Phase 2 — per-feature deep coverage

6. **`simulator-canvas::default-board-renders-A-and-B-markers`** — pixel-sample at (start.x×scale, start.y×scale) is green; at (goal.x×scale, goal.y×scale) is red — canvas helper — ~2s — Must
7. **`simulator-canvas::stall-tints-robot-red`** — drive into obstacle, sample robot pixel, channel R > G+80 — canvas helper — ~3s — Should
8. **`editor-blockly::seed-drive-block-compiles-to-drive-step`** — workspace.load JSON → editor store.programs[2] = [{kind:'drive', cm:30}] — store-bridge — ~2s — Should
9. **`editor-blockly::drag-from-toolbox-creates-block`** — mouse.down on toolbox `drive_distance`, move to workspace centre, mouse.up → workspace JSON contains drive_distance — coordinate drag — ~5s — Should
10. **`editor-blockly::clear-workspace-clears-store`** — load 2-block workspace, then trash all → store programs[2] is empty — store-bridge — ~2s — Should
11. **`boards-editor::create-blank-board-and-save`** — click "new board" → board editor opens → name field → save → boards panel lists it → reload → still listed — DOM + reload — ~5s — Should
12. **`boards-editor::click-to-place-obstacle`** — open editor → select obstacle tool → click canvas at (200, 200) → board.elements has obstacle near (0.5, 0.5) — store-bridge after click — ~3s — Should
13. **`language-toggle::he-toggles-html-dir-and-translates`** — click "עברית" → `<html dir>` is `rtl` → header text is Hebrew — DOM — ~2s — Should
14. **`language-toggle::language-persists-across-reload`** — switch to HE → `page.reload()` → still HE, dir still rtl — DOM after reload — ~3s — Should
15. **`persistence::programs-survive-reload`** — seed via UI a drive block on press 2 → reload → editor opens, press-2 tab still has the block → press 2 button → robot drives — full flow — ~6s — Should
16. **`persistence::malformed-localstorage-falls-back-cleanly`** — pre-set `localStorage['scribbler-sim:programs:v1'] = 'garbage'` → load page → no crash, hardcoded behaviours still work, friendly state — DOM — ~2s — Should
17. **`run-history::successful-run-records-and-replays`** — run to goal → switch to Boards tab → run history has entry → click replay → robot moves through replayed events — store-bridge + DOM — ~6s — Should

### Phase 3 — visual regression baselines

18. **`visual::default-board-empty-state.png`** — full board canvas at idle — `toMatchScreenshot` — ~3s — Could
19. **`visual::editor-with-drive-block.png`** — editor view with one drive block — `toMatchScreenshot` — ~3s — Could
20. **`visual::header-rtl-vs-ltr.png`** (×2 — one per locale) — header region screenshot — `toMatchScreenshot` — ~4s — Could

**Total estimated runtime**: Phase 1 = ~10s; Phase 1+2 = ~60s; Phase 1+2+3 = ~75s. Headless chromium on a 2-year-old Windows laptop. Well under any reasonable budget — `npm run test:all` would land at ~80s total (current jsdom suite is ~3s).

---

## Patterns from qa-automation

Read `C:\code\qa-automation\webUI` for source. Listing the patterns by transferability:

### Strongly transferable

1. **Atomic action / assertion / flow split** (`PageObjectsBible.md`).
   Apply as: `tests/browser/helpers/<feature>.ts` modules each export `<feature>.<actionVerbNoun>()` and `<feature>.assert<What>()`. No flows class — TS module functions are sufficient. Reference: `qa-automation/webUI/PageObjectsBible.md` lines 30-50.

2. **Named timeout constants** (`WaitTimeouts.java`).
   Apply as: `tests/browser/helpers/timeouts.ts` exports `SHORT = 1_000`, `NORMAL = 5_000`, `LONG = 15_000`. The simulator runs in real-time when not under `clock.install()`; sim-driven tests get short timeouts (no flake), genuine async (chunk loads, screenshot stabilization) get long. Reference: `qa-automation/webUI/src/main/java/com/utilities/playwright/WaitTimeouts.java`.

3. **Screenshot-on-failure with attachment metadata** (`BaseWebUITest.java::afterEachTest` + `ScreenshotUtils.java`).
   Apply as: a Vitest reporter that captures a `page.screenshot()` on failure into `tests/browser/failures/<test>-<timestamp>.png`. Local-only, no Allure equivalent needed for an SPA. Reference: `qa-automation/webUI/src/main/java/com/utilities/playwright/ScreenshotUtils.java` lines 8-23.

4. **`waitForXyz` helpers as the only sleep API** (`WaitUtils.java`'s explicit warning on `waitMs`).
   Apply as: `tests/browser/helpers/time.ts` exports `runUntil(predicate, maxFrames)` — no `await page.waitForTimeout(N)` allowed in test code. Reference: `qa-automation/webUI/src/main/java/com/utilities/playwright/WaitUtils.java` lines 168-175.

### Partially transferable

5. **One Playwright per thread** (`BaseWebUITest::TL_PLAYWRIGHT`). Vitest browser mode handles this internally — we get the parallelism for free. Pattern is good to know if Phase 4 ever opens up cross-browser projects.

6. **Trace-on-failure** (qa-automation has `Tracing.start/stop` per test).
   Apply as: enable Playwright trace via `vitest.config.ts` `browser.providerOptions.trace: 'retain-on-failure'`. Reference: `qa-automation/webUI/src/main/java/com/utilities/BaseWebUITest.java` lines 369-389.

### Not a fit (explicitly rejected)

7. **`BaseWebUITest` god-class** with 17 page-object instances. Way more surface than scribbler-simulator has.
8. **Login flows / SF storage state**. Pure client-side app, no auth.
9. **Multiple TestNG suite XMLs** (sanity / regression / negative). Vitest's `--project=browser` + tagged tests via test names is enough.
10. **Allure reporting**. Vitest's HTML reporter is sufficient for a kid's tool.
11. **Iframe handling** (`policyHeaderCombo` uses `frameLocator`). No iframes in the simulator.
12. **Cross-environment URL handling**. There's one URL: `http://localhost:5173`.

---

## Trade-offs

### Bundle size impact

Zero on production. The window-bridge in `main.tsx` is dead-code-eliminated when `import.meta.env.MODE !== 'test'`. Verify after Phase 1 lands by checking `dist/` byte count before vs after.

### CI time impact (local "CI", per CLAUDE.md)

| Stage                | Before | After Phase 1 | After Phase 1+2 | After Phase 1+2+3 |
| -------------------- | ------ | ------------- | --------------- | ----------------- |
| `npm run test`       | ~3s    | ~13s          | ~63s            | ~78s              |
| `npm run typecheck`  | ~4s    | ~4s           | ~4s             | ~4s               |
| Total dev round-trip | ~7s    | ~17s          | ~67s            | ~82s              |

Phase 1+2 stays under 90s, which is the project owner's stated rough target for "still feels fast." Phase 3 visual regression pushes the upper end; mitigation: visual baselines run only in `npm run test:browser`, not `npm run test`, so the SDLC pipeline opts in.

### Maintenance burden

Visual baselines are the biggest maintenance cost. Mitigations:

- **Cap baselines at ~10 files** — only the highest-value scenes
- **Pin to one platform** — Windows laptop, chromium only
- **Manual update gate** — never auto-update
- **`maxDiffPixelRatio: 0.02`** — tolerates aliasing/sub-pixel differences
- **Mask dynamic regions** (timestamps, run-IDs in the run history) via Vitest's `screenshotOptions.mask`

If a baseline-breaking change ships, the project owner reviews the diff in the Vitest UI and either approves (`npm run test:browser:update`) or fixes the regression. This is a HITL item by design.

### What we explicitly do NOT test

| Won't test                                                      | Why                                                                                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 60fps perf sustained over 30s                                   | Hard to assert on a single laptop reliably; manual eyeball still required.                                                                     |
| Real timing accuracy (e.g. "drive 30cm in 2.0s") in the browser | Already covered by deterministic unit tests with bit-exact tick replay. Browser tests use `clock.install`, which removes timing as a variable. |
| Cross-browser compat (Firefox, Webkit)                          | Only chromium in Phase 1-3. Kid's family laptop runs Chrome. Phase 4 is the trigger.                                                           |
| Mobile viewport                                                 | Out of scope per CLAUDE.md. Tablet may follow post-competition.                                                                                |
| Audio (`beep` step)                                             | AudioContext sampling is deep magic; assert it was _invoked_, not that it was _audible_.                                                       |
| Real keyboard accessibility (tab order, focus rings)            | Should add later; not Phase 1-3.                                                                                                               |
| Print / PDF export                                              | No such feature exists or is planned.                                                                                                          |

---

## Migration / rollout plan

### Phase 1 — smoke tests + infra (~6 hours)

Ship together so the SDLC pipeline can rely on the gate:

1. Install deps (`@vitest/browser`, `@vitest/browser-playwright`, `playwright`, `vitest-browser-react`).
2. Add `vitest.config.ts` workspace split.
3. Add `tests/browser/helpers/{store-bridge,canvas,blockly,time,i18n}.ts` (the framework — empty test directory besides smoke).
4. Add `src/main.tsx` window bridge.
5. Write the **5 Phase-1 smoke tests** from the inventory above.
6. Add `npm run test:browser` and `npm run test:all` scripts.
7. Document in `CLAUDE.md` how the SDLC `Phase 7` gate runs `npm run test:all`.

**Ships when**: 5/5 smoke tests pass on the project owner's laptop, twice in a row, with no flake.

### Phase 2 — per-feature deep coverage (~10 hours)

Tests 6-17 from the inventory, plus all `helpers/<feature>.ts` modules. Probably split over 2-3 SDLC items, e.g.:

- 2a — editor & blockly tests
- 2b — boards & persistence tests
- 2c — language toggle & RTL tests

**Ships when**: each SDLC item ships its slice green; suite stays under 70s.

### Phase 3 — visual regression for canvas (~4 hours)

Tests 18-20. Includes baseline-update workflow doc, mask configuration, the "review the diff before update" HITL note.

**Ships when**: 3 baselines green twice in a row on the project owner's laptop and the diff-review workflow is documented.

### Phase 4 — cross-browser (DEFERRED, post-competition)

Add Firefox + Webkit projects. Re-baseline visual tests per platform. Decide whether the value (tablet Safari? niche Linux support?) justifies the maintenance overhead. Probably no.

**Trigger**: only if the kid actually runs into a non-Chrome rendering bug in real use. Not on the auto-roadmap.

### Each phase summary

| Phase | Hrs        | Tests | Manual still required after           |
| ----- | ---------- | ----- | ------------------------------------- |
| 1     | 6          | 5     | Hebrew aesthetics, animation feel     |
| 2     | 10         | 12    | RTL aesthetics, animation feel        |
| 3     | 4          | 3     | Animation feel, font rendering quirks |
| 4     | (deferred) | —     | —                                     |

After Phase 3, the SDLC pipeline can declare features "done" autonomously for ~90% of the gaps `docs/status.md` flagged. The remaining ~10% (animation feel, kid-readability of Hebrew) stay HITL — but they'd stay HITL even with a perfect test suite, because they are genuinely subjective.

---

## Test skeletons

Three concrete examples to anchor the design. Pseudocode where APIs are still being read from docs; intent is correctness over copy-paste.

### Skeleton 1 — smoke test (Phase 1, test #2)

```typescript
// tests/browser/smoke.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { page } from '@vitest/browser/context';
import { simulator } from './helpers/simulator';
import { time } from './helpers/time';
import { storeBridge } from './helpers/store-bridge';

describe('smoke: golden path', () => {
  beforeEach(async () => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto('/'); // dev server served by Vitest browser mode
    await storeBridge.resetAll();
  });

  it('press-2x-moves-robot', async () => {
    const startX = storeBridge.simStore().robot.x;
    await simulator.pressReset(2);
    expect(storeBridge.simStore().status).toBe('running');

    // advance 2.2 seconds of sim time = 132 rAF frames at 60Hz
    await time.runFor(2200);

    const robot = storeBridge.simStore().robot;
    expect(robot.x - startX).toBeCloseTo(0.3, 1);
    expect(robot.y).toBeCloseTo(startX, 1);
  });
});
```

### Skeleton 2 — canvas pixel-sampling test (Phase 2, test #6)

```typescript
// tests/browser/simulator-canvas.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { page } from '@vitest/browser/context';
import { canvas } from './helpers/canvas';
import { storeBridge } from './helpers/store-bridge';

describe('simulator canvas: marker rendering', () => {
  beforeEach(async () => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.goto('/');
    await storeBridge.resetAll();
    await time.runFor(50); // let one rAF frame paint
  });

  it('default-board-renders-A-and-B-markers', async () => {
    const board = storeBridge.simStore().board;
    const start = board.elements.find((e) => e.kind === 'start')!;
    const goal = board.elements.find((e) => e.kind === 'goal')!;
    const CANVAS_PX = 500;

    const startPx = await canvas.samplePixel(
      Math.round((start.x / board.width) * CANVAS_PX),
      Math.round((start.y / board.height) * CANVAS_PX),
    );
    expect(startPx.g).toBeGreaterThan(120); // green A marker
    expect(startPx.g).toBeGreaterThan(startPx.r + 20);

    const goalPx = await canvas.samplePixel(
      Math.round((goal.x / board.width) * CANVAS_PX),
      Math.round((goal.y / board.height) * CANVAS_PX),
    );
    expect(goalPx.r).toBeGreaterThan(150); // red B marker
    expect(goalPx.r).toBeGreaterThan(goalPx.g + 60);
  });
});

// helpers/canvas.ts
export const canvas = {
  async samplePixel(x: number, y: number): Promise<{ r: number; g: number; b: number; a: number }> {
    return await page.evaluate(
      ([px, py]) => {
        const c = document.querySelector('canvas[role="img"]') as HTMLCanvasElement;
        const ctx = c.getContext('2d')!;
        const data = ctx.getImageData(px, py, 1, 1).data;
        return { r: data[0], g: data[1], b: data[2], a: data[3] };
      },
      [x, y],
    );
  },
};
```

### Skeleton 3 — Blockly workspace JSON injection (Phase 2, test #8)

```typescript
// tests/browser/editor-blockly.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { page } from '@vitest/browser/context';
import { blockly } from './helpers/blockly';
import { storeBridge } from './helpers/store-bridge';
import { driveBlockJson } from './fixtures/programs';

describe('editor: blockly → store wiring', () => {
  beforeEach(async () => {
    await page.goto('/');
    await page.getByRole('tab', { name: /edit behaviors/i }).click();
    await page.getByRole('tab', { name: /edit press 2 times/i }).click();
    // wait for the lazy chunk + Blockly inject
    await blockly.waitForWorkspaceReady();
  });

  it('seed-drive-block-compiles-to-drive-step', async () => {
    await blockly.loadWorkspaceJson(driveBlockJson);
    // store update is async via the change listener; one tick is enough
    await page.waitForFunction(() => {
      const programs = (window as any).__scribbler.editorStore.getState().programs;
      return programs[2] && programs[2].length > 0;
    });
    const programs = storeBridge.editorStore().programs;
    expect(programs[2]).toEqual([{ kind: 'drive', cm: 30 }]);
  });
});

// fixtures/programs.ts
export const driveBlockJson = {
  blocks: {
    languageVersion: 0,
    blocks: [
      {
        type: 'drive_distance',
        fields: { CM: 30 },
        x: 100,
        y: 100,
      },
    ],
  },
};

// helpers/blockly.ts
export const blockly = {
  async waitForWorkspaceReady(): Promise<void> {
    await page.waitForSelector('.blocklyWorkspace svg.blocklySvg', { state: 'visible' });
  },
  async loadWorkspaceJson(json: object): Promise<void> {
    await page.evaluate((data) => {
      const Blockly = (window as any).Blockly;
      const ws = Blockly.getMainWorkspace();
      Blockly.serialization.workspaces.load(data, ws);
    }, json);
  },
};
```

---

## HITL items / open questions

1. **Source-side window bridge** — confirm with the project owner that exposing `__scribbler` in test mode is acceptable. Default plan says yes (matches existing unit-test idiom, dead-code-eliminated in prod). If no, fall back to pure black-box → +50% test runtime, more brittle, weaker assertions on physics-y state.

2. **Visual baseline platform** — confirmed Windows + chromium only? Spelling out so a future contributor on Mac doesn't waste a day debugging "why my baselines fail." Default: Windows-pinned baselines, document the constraint in `tests/browser/README.md`.

3. **Phase 3 budget for screenshot review** — three baselines × 2-3 review rounds = ~30 min/year. Acceptable. If the kid's UI churns more than expected, this scales linearly. Re-evaluate at Phase 3 ship.

4. **Real-S3 calibration** — out-of-scope reaffirmed. No browser tests for "the simulator matches the real robot." When/if a robot becomes available, that's a new design doc.

5. **`tests/playwright-e2e/` reserve slot** — keep the folder + README placeholder, or only create on demand? Default: README placeholder only; saves zero LOC and avoids the temptation to over-engineer. Add the folder when an actual flow needs it.

6. **Reporter choice** — default Vitest HTML reporter, or add `vitest-allure-reporter`? qa-automation uses Allure; for a single-developer project Vitest's built-in is fine. Default: Vitest HTML.

---

## Architect Handoff

```
[AGENT:architect | COMPLETE | files-changing=0 (planning-only) | design-decisions=6 | hitl-flags=6 | diagram=text-only | test-skeletons=3]
```

The Developer should **not** start work from this doc directly — the project owner first reviews the 6 HITL items above, especially the window-bridge decision (#1) and the platform pin (#2). After approval, this becomes the design input for an SDLC item titled "Add browser-based UI test layer (Phase 1 — smoke tests + infra)." That item ships only the 5 Phase-1 tests; Phase 2 and beyond each get their own backlog entries.

Sources consulted:

- Playwright docs: [Clock](https://playwright.dev/docs/clock), [Visual comparisons](https://playwright.dev/docs/test-snapshots), [Components (experimental)](https://playwright.dev/docs/test-components)
- Vitest docs: [Browser Mode](https://vitest.dev/guide/browser/), [Visual Regression](https://vitest.dev/guide/browser/visual-regression-testing), [Configuring Playwright provider](https://vitest.dev/config/browser/playwright)
- [Vitest Browser Mode vs Playwright Component Testing — pkgpulse 2026](https://www.pkgpulse.com/blog/vitest-browser-mode-vs-playwright-component-testing-vs-2026)
- [Vitest Browser Mode vs Playwright — Epic Web](https://www.epicweb.dev/vitest-browser-mode-vs-playwright)
- [HTML Canvas + Playwright PoC — satelllte/playwright-canvas](https://github.com/satelllte/playwright-canvas)
- [Canvas + WebGL testing playbook — testdino-hq/playwright-skill](https://github.com/testdino-hq/playwright-skill/blob/main/core/canvas-and-webgl.md)
- qa-automation patterns at `C:\code\qa-automation\webUI\` — `BaseWebUITest.java`, `WaitUtils.java`, `WaitTimeouts.java`, `ScreenshotUtils.java`, `PageObjectsBible.md`
