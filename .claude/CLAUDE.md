# Scribbler Simulator — Project Instructions

## What This Is

A browser-based simulator for the Parallax Scribbler 3 (S3) robot. Built so an 8-year-old can practice for an Israeli school robotics competition without access to physical hardware.

The simulator models:

- Differential-drive physics on a 2D top-down board
- Press-count button actuation (the real S3 has only one physical Reset button; pressing it 2×/3×/4×… triggers different pre-programmed behaviors)
- Sensors: line-following, IR obstacle, encoder-based motion, light
- Bilingual UI (Hebrew with RTL + English, toggleable)

The competition format: a paired team navigates from point A to point B on a board with obstacles, by sequencing the kid's pre-built behaviors via reset-button press counts. They get a paper cheat-sheet listing what each press-count does.

## Project Status

- Created: 2026-05-10
- Target: usable practice tool by competition (~mid-June 2026)
- Source robot: Parallax Scribbler 3 (S3) — discontinued, no official simulator exists

---

## Quick Reference

### Primary entry point

```
use sdlc: <feature or bug description>
```

This triggers the full autonomous pipeline:

```
PO → Team Lead → Architect → Developer → Security → Review → Tests → PR → Retro
```

**Project-level override**: PR step is suspended (see Git Workflow below). The pipeline should commit and merge directly to `main` until further notice.

### Individual skills

```
/product-owner        → write requirements only
/architect            → design only
/security-researcher  → security check only
/code-reviewer        → code review only
/diagram-generator    → generate draw.io architecture diagram
/flow-reviewer        → retrospective on last SDLC run
/btw-status           → report current SDLC run status
/skill-inventory      → audit skills directory
```

---

## Stack

- **Language**: TypeScript 5.7 (strict mode)
- **Framework**: React 19 + Vite 6
- **Block editor**: Blockly 11 (vocabulary mirrors [BlocklyProp Solo](https://learn.parallax.com/reference/scribbler-3-robot-block-reference/))
- **Rendering**: HTML5 Canvas (2D top-down sim)
- **i18n**: i18next + react-i18next (Hebrew RTL + English)
- **Test framework**: Vitest + @testing-library/react + jsdom
- **Linter / formatter**: ESLint 9 (flat config, `eslint.config.js`: typescript-eslint recommended + react-hooks) + Prettier — `npm run lint`, `npm run format`, `npm run format:check`; enforced in CI
- **Type checker**: tsc strict
- **Package manager**: npm

## Build Commands

```powershell
# Install dependencies
npm install

# Type check
npm run typecheck

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Start dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Phase 7 sandbox image — fall back to supervised shell since Node deps install at runtime
SDLC_TEST_IMAGE=node:22-alpine
```

## Repository

- **Platform**: local-only (no remote yet — to be decided)
- **Org / workspace**: N/A
- **Repo name**: scribbler-simulator
- **Main branch**: main

---

## SDLC Skills Available

| Skill                 | Trigger                   | Model                    |
| --------------------- | ------------------------- | ------------------------ |
| `sdlc`                | `use sdlc: <description>` | Orchestrator             |
| `product-owner`       | `/product-owner`          | Opus                     |
| `team-lead`           | `/team-lead`              | Opus                     |
| `architect`           | `/architect`              | Opus + extended thinking |
| `developer`           | internal                  | Sonnet                   |
| `react-developer`     | `/react-developer`        | Sonnet                   |
| `test-reviewer`       | internal (Phase 4.5)      | Sonnet                   |
| `security-researcher` | `/security-researcher`    | Sonnet                   |
| `code-reviewer`       | `/code-reviewer`          | Sonnet                   |
| `flow-reviewer`       | `/flow-reviewer`          | Sonnet                   |
| `diagram-generator`   | `/diagram-generator`      | Sonnet                   |
| `skill-inventory`     | `/skill-inventory`        | Sonnet                   |
| `btw-status`          | `/btw-status`             | —                        |

Skills synced from `C:\code\claude-sdlc` per `claude-skills.lock`. To refresh: `.\scripts\sync-claude-skills.ps1`.

---

## Coding Standards

### General

- **TypeScript strict mode** required (no `any`, no implicit any)
- **All public function signatures typed** — exports must declare return types
- **Async**: prefer `async/await` over raw promises
- **Error handling**: catch specific errors; no bare `catch` that hides them
- **No console.log in committed code** — use a debug helper or remove
- **Tests**: ≥80% coverage on game logic (physics, sensor sim, board state); UI tests via Testing Library
- **Bilingual strings**: every user-facing string lives in `src/i18n/{he,en}.json` — no hardcoded UI text

### Security

- **No secrets in repo** — none expected (pure client-side static app)
- **Input validation**: validate at file-import boundaries (saved programs, custom boards)
- **Dependencies**: pin major versions; audit on each new dep

### Project-specific

- **Block vocabulary** mirrors BlocklyProp Solo. Two block sets, both required:
  - **Distance/rotation**: `drive_distance`, `rotate_degrees`, `drive_wheels`, `drive_arc`, `stop`, `beep` (`set_led` removed 2026-07-12 — was an orphan step with no block/runtime effect; restore only with a real LED visual)
  - **Sensor-reactive**: `line_left`/`right`, `obstacle_left`/`right`, `light_above` predicates via `if_sensor`/`while_sensor`/`while_not_sensor`
  - **Grade visibility**: the toolbox is filtered per grade via `src/grade/config.ts` (grade 4 hides `drive_wheels`/`drive_arc`); all blocks stay registered
- **Press-count idiom**: the simulator's "run" UI is N×Reset buttons. Programming UI binds each press-count (2..N) to a Blockly program.
- **Physics fidelity**: differential-drive math is exact; speed/acceleration calibrated from Parallax specs (no real robot available for measurement). Hidden calibration panel for future tuning.

---

## Git Workflow

### Branching

```
main (only branch in active use right now)
```

Feature branches will be reintroduced after the MVP ships.

### Commit message format

```
<type>(<scope>): <subject>

Types: feat, fix, docs, refactor, test, chore
```

### **PR strategy: SUSPENDED**

Per project owner directive 2026-05-10: do **not** open PRs during the pre-competition phase. The SDLC orchestrator's Phase 8 should commit and merge directly to `main` instead of opening a PR via `gh`/`bb`. Revisit after the first usable build is in the kid's hands.

If the SDLC pipeline tries to open a PR, treat the local commit + merge as Phase 8 completion.

---

## Host Posture

```
Host Posture: local-dev-supervised
```

The project owner is at the keyboard on a personal Windows machine; full shell access is acceptable. Phase 7 runs silently.

---

## Environment Variables

None required for runtime — fully client-side static app, no API calls.

```bash
# Optional, for SDLC observability (leave unset to disable)
LANGSMITH_API_KEY=
OTEL_ENDPOINT=
```

---

## HITL Policy

The SDLC pipeline runs autonomously except when:

1. A decision requires the project owner's input (scope, naming, kid-UX trade-offs)
2. Security researcher returns BLOCKED
3. Tests fail outside the current sprint scope
4. Acceptance criteria are ambiguous

HITL items are collected by the Team Lead and presented clearly with options.

---

## Project-Specific Context

### Target audience

- **Primary user**: 8-year-old Hebrew speaker, familiar with BlocklyProp Solo from school class
- **Secondary user**: parent — supervising practice sessions, may also tweak board layouts

### The competition format (per teacher's WhatsApp, 2026-05)

> "in the final, students are tested on operating the robot with emphasis on road safety. There will be a board with obstacles marked, and they need to bring the robot from point A to point B in the most efficient way. Operation of the robot is according to the code they built and know, and each pair will get a sheet listing what each button press does as a reminder."

So the simulator's "competition mode" should let the kid:

1. See a board with obstacles + A/B markers
2. See a cheat-sheet of "Press Reset Nx → does X" (matching what they programmed)
3. Click virtual buttons to actuate behaviors
4. Watch the robot move
5. Reset and retry; track time-to-completion

### Out of scope for the 4-week timeline

- Importing real BlocklyProp Solo `.svg` files
- 3D rendering
- Multiplayer / network features
- Cloud save (localStorage only)
- Phone-form-factor UI (tablet OK; phone is a stretch goal)
- Mic / sound-based behaviors (S3 has a mic, but kid programs are unlikely to use it)

### Stretch goals (post-competition)

- Import/export real BlocklyProp Solo programs
- Pen-down drawing mode (Scribbler-Art-style)
- Replay recording → shareable link
- Calibration mode (if real robot becomes available)

---

## Diagram Integration

Architecture diagrams are generated as draw.io XML (`.drawio` files). View at [app.diagrams.net](https://app.diagrams.net).

To generate a new diagram:

```
/diagram-generator explain the architecture of the simulator core loop
```

---

## Cross-Repo Skill Sharing

Skills synced from `C:\code\claude-sdlc` via `claude-skills.lock` and `scripts/sync-claude-skills.ps1`. See `C:\code\claude-sdlc\docs\skills-sharing.md` for the convention.

To refresh:

```powershell
.\scripts\sync-claude-skills.ps1 -DryRun  # preview
.\scripts\sync-claude-skills.ps1          # apply
```

---

## Framework Version

Source framework: claude-sdlc v1.0 @ `2fb02a8`
Last Updated: 2026-05-10
