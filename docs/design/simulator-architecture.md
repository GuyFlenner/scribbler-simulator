# Design: Scribbler Simulator (overall architecture)

**Tier**: 3
**Status**: Accepted — 2026-05-10
**Source backlog**: `docs/backlog/initial-backlog.md`
**Related ADRs**: [ADR-0001 — Build custom rather than adapt generic](../adr/0001-build-custom-simulator-rather-than-adapt-generic.md)

This is the top-level design covering all five backlog items at architectural granularity. Per-item implementation details are deferred to per-sprint design notes (or to the developer's discretion when they fall within the structures defined here).

---

## What Changes

This is a **greenfield project** — no existing code is touched. New top-level structure:

```
src/
├── sim/                        ← Simulator engine (pure TypeScript, no React)
│   ├── types.ts                ← RobotState, BoardState, SimState
│   ├── physics.ts              ← Differential drive math, collision, deterministic ticks
│   ├── sensors.ts              ← Pure functions: read(robotState, board) → SensorValues
│   ├── runtime.ts              ← Behavior executor: runs Step[] against physics
│   ├── boards/
│   │   ├── default.ts          ← Hardcoded MVP board (Item 1)
│   │   └── schema.ts           ← Board element types + Zod parser
│   ├── behaviors/
│   │   ├── hardcoded.ts        ← MVP fallback behaviors (Item 1)
│   │   └── schema.ts           ← Step, Behavior, Program types
│   └── replay.ts               ← Input log record/playback (Item 5)
├── editor/                     ← Block editor (Blockly integration; Items 2–3)
│   ├── BlocklyEditor.tsx
│   ├── toolbox.ts              ← Block definitions (deterministic + sensor blocks)
│   ├── codegen.ts              ← Block XML → Step[] compiler
│   └── persistence.ts          ← localStorage save/load with schema validation
├── components/
│   ├── App.tsx
│   ├── SimulatorView.tsx
│   ├── BoardCanvas.tsx
│   ├── PressButtons.tsx
│   ├── BoardEditor.tsx         ← Item 5
│   ├── RunHistoryPanel.tsx     ← Item 5
│   └── LanguageToggle.tsx      ← Item 4
├── store/                      ← Zustand stores
│   ├── sim-store.ts            ← Sim state, current board, current run
│   ├── editor-store.ts         ← Authored programs per press-count
│   ├── boards-store.ts         ← User-created boards (Item 5)
│   └── persistence.ts          ← localStorage adapter, version migrations
├── i18n/
│   ├── index.ts                ← i18next bootstrap
│   ├── he.json
│   └── en.json
├── main.tsx
├── App.css
└── index.css
```

**Key new types** (excerpt — full definitions live in source):

```typescript
// src/sim/types.ts
export interface RobotState {
  x: number; // metres, board coordinates (0..1 for a 1m × 1m board)
  y: number;
  heading: number; // radians, 0 = +x axis (east)
  vLinear: number; // m/s
  vAngular: number; // rad/s, positive = counter-clockwise
  isStalled: boolean;
  encoderTicksLeft: number;
  encoderTicksRight: number;
}

export interface SimState {
  robot: RobotState;
  board: BoardState;
  tickIndex: number; // monotonic, used for determinism + replay
  status: 'idle' | 'running' | 'reached-goal' | 'stalled';
  runStartedAt: number | null; // wall clock ms; null if idle
}
```

```typescript
// src/sim/behaviors/schema.ts
export type SensorPredicate =
  | { kind: 'line_left' }
  | { kind: 'line_right' }
  | { kind: 'obstacle_left' }
  | { kind: 'obstacle_right' }
  | { kind: 'light_above'; threshold: number }
  | { kind: 'not'; inner: SensorPredicate }
  | { kind: 'and'; left: SensorPredicate; right: SensorPredicate }
  | { kind: 'or'; left: SensorPredicate; right: SensorPredicate };

export type Step =
  | { kind: 'drive'; cm: number; speed?: number }
  | { kind: 'rotate'; degrees: number; speed?: number }
  | { kind: 'stop' }
  | { kind: 'beep'; durationMs: number; freqHz?: number }
  | { kind: 'set_led'; led: 'left' | 'centre' | 'right'; r: number; g: number }
  | { kind: 'wait'; seconds: number }
  | { kind: 'if'; condition: SensorPredicate; then: Step[]; else?: Step[] }
  | { kind: 'while'; condition: SensorPredicate; body: Step[]; maxIterations: number }
  | { kind: 'repeat'; times: number; body: Step[] };

export interface Behavior {
  pressCount: number; // 2..8
  label: string;
  steps: Step[];
}

export interface Program {
  version: 1;
  behaviors: Behavior[]; // sparse — only defined press-counts present
}
```

```typescript
// src/sim/boards/schema.ts
export type BoardElement =
  | { kind: 'obstacle'; x: number; y: number; w: number; h: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; thickness: number }
  | { kind: 'light'; x: number; y: number; intensity: number }
  | { kind: 'start'; x: number; y: number; heading: number }
  | { kind: 'goal'; x: number; y: number; toleranceCm: number };

export interface BoardState {
  version: 1;
  id: string; // user-given; default board has id='default'
  name: string;
  width: number; // metres
  height: number;
  elements: BoardElement[];
}
```

```typescript
// src/sim/physics.ts
export function tick(state: SimState, dtSeconds: number): SimState; // pure; deterministic
export function detectCollision(robot: RobotState, board: BoardState): CollisionResult;
export function makeRobotState(init: Partial<RobotState>): RobotState;

// src/sim/sensors.ts
export function readLineSensorLeft(robot: RobotState, board: BoardState): boolean;
export function readLineSensorRight(robot: RobotState, board: BoardState): boolean;
export function readObstacleLeft(robot: RobotState, board: BoardState): boolean;
export function readObstacleRight(robot: RobotState, board: BoardState): boolean;
export function readLightSensor(robot: RobotState, board: BoardState): number; // 0..255

// src/sim/runtime.ts
export interface RuntimeHandle {
  start(steps: Step[], state: SimState): void;
  stop(): void;
  isRunning(): boolean;
}
export function createRuntime(physicsTick: typeof tick, hz?: number): RuntimeHandle;
```

```typescript
// src/editor/codegen.ts
export function compile(blocklyXml: string): Step[];
export function compileWorkspace(workspace: Blockly.WorkspaceSvg): Step[];
```

---

## Why

The simulator delivers four things, in order of importance:

1. **Foundational sim engine** — without a working physics + render loop, no other piece is observable
2. **Block-editor authoring surface** — the kid must be able to define behaviors that match what he built in class
3. **Sensor reactivity** — his class programs use both deterministic and sensor-based behaviors
4. **Practice ergonomics** — bilingual UI, varied boards, time tracking; the difference between a demo and a tool he uses daily

This design separates the **pure sim engine** (`src/sim/`) from React, which is critical for testability and determinism. The runtime is driven by a fixed-step physics tick (60Hz) so replay (Item 5) and tests are bit-exact.

---

## Architecture Decision

**Chosen approach:** Custom-built simulator using **Vite + React + Blockly + Canvas2D**, with a pure-TypeScript sim engine decoupled from React, state held in **Zustand** stores, and persistence via versioned localStorage schemas.

### Alternatives considered

1. **Adopt Open Roberta Lab and fork it for Scribbler** — rejected: Java/GWT, requires server hosting; doesn't model the press-count idiom; toolbox uses NEPO (different vocabulary from BlocklyProp Solo); fork-and-adapt cost > greenfield cost in a 4-week budget.

2. **Use Gears (Babylon.js + Ammo) and add a Scribbler model** — rejected: 3D engine is overkill for the kid's mental model (he programs distances and rotations, not physics). Gears does not expose a clean Blockly toolbox-customisation seam. Performance risk on a low-end family laptop.

3. **State management: Redux Toolkit instead of Zustand** — rejected: Zustand's smaller API surface (no actions/reducers boilerplate) is a better fit for the codebase size; the sim engine is the complex part, not the UI state.

4. **Render with SVG instead of Canvas2D** — rejected: SVG is appealing for accessibility and DOM-inspectable debugging, but a 60Hz rerender of dozens of obstacles + a moving robot stresses the SVG path more than Canvas. Canvas keeps the render loop simple.

### Accepted trade-offs

- **All bugs are ours** — no upstream community to escalate to. Mitigated by aggressive unit testing of the physics core (highest bug surface).
- **No transfer-validation against the real robot** — we calibrate from Parallax specs only. The kid will only verify simulator-to-real fidelity at the competition itself. Accepted; offering a sim that's "directionally correct" is much better than offering nothing.
- **Custom physics + collision math** — implemented from scratch. ~1–2 days of bug-hunt budget allocated in Item 1.
- **Blockly + React rerender gotchas** — well-documented in the Blockly community; budget half a day for the integration glue (workspace lifecycle, dispose-on-unmount).
- **Performance ceiling on low-end hardware** — Canvas2D + 60Hz tick is fine for a single robot; we accept that 100+ obstacles with light sources may dip below 60fps. Not in spec.

---

## Constraints

- **Must not break**: nothing — greenfield
- **Must satisfy**: all P0/P1 acceptance criteria from `docs/backlog/initial-backlog.md`
- **Performance target**: 60fps render on a low-end Windows laptop (Intel UHD); physics tick budget < 4ms; sensor reads + collision per tick < 1ms
- **Storage budget**: 1MB total localStorage across all keys (`programs:v1`, `boards:v1`, `runs:v1`, `prefs:v1`)
- **Determinism**: physics + runtime tick must be bit-exact reproducible from `(initialState, inputLog, board)` — required by Item 5 replay
- **Security**:
  - localStorage is the only persisted surface; no SSRF / SQL / network attack surface (fully client-side)
  - User-saved programs and boards must be **schema-validated on load** (Zod or hand-rolled type guards). Untyped JSON from localStorage is treated as untrusted input.
  - Blockly XML is processed by Blockly's own parser, not eval'd as JS — the only execution path is our own `compile()` returning a typed `Step[]`

---

## Test Strategy

### Unit tests (Vitest)

- `sim/physics.test.ts` — drive forward/backward distance accuracy; rotation accuracy; collision detection; encoder tick parity (left/right wheel ticks should differ during rotation, match during straight drive); deterministic tick replay (run 1000 ticks twice, assert identical output)
- `sim/sensors.test.ts` — each sensor read against fixture boards (line crossing, obstacle in cone, light intensity)
- `sim/runtime.test.ts` — Step execution for each kind; if/else/while/repeat semantics; stop on collision; `maxIterations` cap
- `sim/boards/schema.test.ts` — schema parser accepts valid boards, rejects malformed (security)
- `editor/codegen.test.ts` — Blockly XML → Step[] for each block type
- `editor/persistence.test.ts` — load rejects malformed JSON, accepts valid (security)
- `i18n/keys.test.ts` — every key in `he.json` exists in `en.json` and vice versa (Item 4 enforcement)

### Integration tests (Testing Library + jsdom)

- `App.test.tsx` — load page → click "Press 2×" → robot moves → reaches B → success overlay
- `editor/Editor.test.tsx` — drag a `drive_distance` block → save → reopen → restored
- `BoardEditor.test.tsx` — place obstacle → save board → load → obstacle present
- `LanguageToggle.test.tsx` — toggle He → all visible strings change → `dir=rtl` set on `<html>`

### Security-relevant paths

- `editor/persistence.ts::loadProgram` — must validate JSON shape and reject untrusted strings. Verified by `editor/persistence.test.ts::rejectsMalformedPrograms` and `::rejectsScriptInjection`.
- `sim/boards/schema.ts::parseBoard` — same. Verified by `sim/boards/schema.test.ts::rejectsNonNumericCoords`.

### Edge cases

- Robot starts on a goal marker (immediate win? — spec says no, requires at least one button press)
- `while(true)` infinite loop in user program — must hit `maxIterations` cap (10,000 ticks ≈ 167s) and stop with friendly message
- Two obstacles overlapping — collision detected against the union, not double-counted
- Board imported from a future schema version — version check, friendly error
- Hebrew RTL with embedded numerals + units (`30 ס"מ` should not visually break)
- localStorage quota exceeded — degrade gracefully, surface error to user

### Performance verification

- `sim/physics.bench.ts` — 1000 ticks completes in <100ms (single-threaded Node). If exceeded, profile + inline the hot path.
- Manual: load board with 20 obstacles, run for 60s, observe DevTools shows fps stays >50. No automated browser-perf gate (out of scope for 4-week budget).

---

## Migration / Rollout Plan

N/A — greenfield, no production users.

PR strategy is suspended per project-owner directive (see `.claude/CLAUDE.md` § Git Workflow). All commits land on `main` directly until the first usable build is in the kid's hands.

---

## Test Skeletons (Item 1 — Tier 3 required)

Each skeleton maps 1:1 to a user-derived AC in Item 1.

```typescript
// src/sim/physics.test.ts
import { describe, it, expect } from 'vitest';
import { tick, makeRobotState } from './physics';
import { defaultBoard } from './boards/default';

describe('physics.tick — drive forward', () => {
  // AC: clicking "Press 2x" drives forward 30cm in <2s
  it('moves 0.30m forward at 0.15 m/s after 2 seconds of ticks', () => {
    const robot = makeRobotState({ x: 0, y: 0, heading: 0, vLinear: 0.15 });
    let state = {
      robot,
      board: defaultBoard,
      tickIndex: 0,
      status: 'running' as const,
      runStartedAt: 0,
    };
    for (let i = 0; i < 120; i++) state = tick(state, 1 / 60); // FAILS until tick is implemented
    expect(state.robot.x).toBeCloseTo(0.3, 2);
    expect(state.robot.y).toBeCloseTo(0, 2);
  });
});

describe('physics.tick — collision', () => {
  // AC: bounding-box intersection with obstacle stops the robot
  it('stops the robot at the collision point and sets isStalled', () => {
    const board = {
      ...defaultBoard,
      elements: [{ kind: 'obstacle' as const, x: 0.1, y: -0.05, w: 0.05, h: 0.1 }],
    };
    const robot = makeRobotState({ x: 0, y: 0, heading: 0, vLinear: 0.15 });
    let state = { robot, board, tickIndex: 0, status: 'running' as const, runStartedAt: 0 };
    for (let i = 0; i < 60; i++) state = tick(state, 1 / 60); // FAILS until collision is implemented
    expect(state.robot.isStalled).toBe(true);
    expect(state.robot.x).toBeLessThan(0.15);
  });
});
```

```typescript
// src/components/App.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App — reach goal', () => {
  // AC: success overlay appears when robot reaches B
  it('shows the well-done overlay after a successful navigation sequence', async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText(/press reset 5 times/i));  // FAILS until App + buttons + sim wired
    await waitFor(
      () => expect(screen.getByText(/well done/i)).toBeInTheDocument(),
      { timeout: 5000 },
    );
  });
});

describe('App — reset board', () => {
  // AC: Reset board returns robot to A
  it('returns the robot to point A on reset', async () => {
    render(<App />);
    fireEvent.click(screen.getByLabelText(/press reset 2 times/i));
    await waitFor(() => expect(screen.getByTestId('robot')).toHaveAttribute('data-x', '0.30')); // FAILS until reset wired
    fireEvent.click(screen.getByRole('button', { name: /reset board/i }));
    await waitFor(() => expect(screen.getByTestId('robot')).toHaveAttribute('data-x', '0'));
  });
});
```

```typescript
// src/sim/boards/schema.test.ts
import { describe, it, expect } from 'vitest';
import { parseBoard } from './schema';

describe('parseBoard — security', () => {
  // AC (security boilerplate, made explicit): malformed boards rejected
  it('rejects boards with non-numeric coordinates', () => {
    const malformed = JSON.stringify({
      version: 1,
      id: 'evil',
      name: 'x',
      width: 1,
      height: 1,
      elements: [{ kind: 'obstacle', x: '<script>', y: 0, w: 1, h: 1 }],
    });
    expect(() => parseBoard(malformed)).toThrow(/invalid|expected number/i); // FAILS until parseBoard validates
  });
});
```

```typescript
// src/i18n/keys.test.ts
import { describe, it, expect } from 'vitest';
import he from './he.json';
import en from './en.json';
import { deepKeys } from './deep-keys'; // helper to be implemented

describe('i18n parity', () => {
  // AC (Item 4): no missing translation keys
  it('every he.json key exists in en.json and vice versa', () => {
    expect(deepKeys(he).sort()).toEqual(deepKeys(en).sort()); // FAILS if any key missing on either side
  });
});
```

```typescript
// src/editor/codegen.test.ts (Item 2 anticipation — included for completeness)
import { describe, it, expect } from 'vitest';
import { compile } from './codegen';

describe('codegen.drive_distance', () => {
  it('compiles a drive_distance(30) block to a single drive Step', () => {
    const xml = `<block type="drive_distance"><field name="CM">30</field></block>`;
    expect(compile(xml)).toEqual([{ kind: 'drive', cm: 30 }]); // FAILS until compile is implemented
  });
});
```

---

## Architect Handoff

```
[AGENT:architect | COMPLETE | files-changing=22 (new) | design-decisions=4 | hitl-flags=0 | diagram=produced | test-skeletons=6]
```

Diagram filed at `diagrams/simulator-architecture.drawio`. Open in [app.diagrams.net](https://app.diagrams.net) or the VS Code draw.io extension.

The Developer should start with Item 1 (`P0`, MVP simulator core). The four test skeletons in this doc, plus the boards-schema and i18n-keys skeletons, give Test-Writer mode an unambiguous starting set.
