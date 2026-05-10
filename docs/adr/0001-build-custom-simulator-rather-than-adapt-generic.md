# ADR-0001: Build a custom simulator rather than adapt a generic open-source one

## Status

Accepted — 2026-05-10

## Context

The Scribbler 3 simulator must ship in ~4 weeks for a school robotics competition (mid-June 2026). Primary user: an 8-year-old who programmed the real robot in class with BlocklyProp Solo. No browser simulator exists for the Scribbler 3 specifically (Parallax never built one; community searches surface nothing).

Three classes of solution exist:

1. **Build a custom simulator from scratch** (TS + React + Blockly + Canvas2D)
2. **Fork a generic browser robot simulator** (Open Roberta Lab, Gears, Rocksi, BrowserBotics)
3. **Skip simulation, use a non-block sandbox** like Scratch with a Scribbler-shaped sprite

## Decision

Build a custom simulator (option 1).

## Rationale

- **The competition's core idiom is press-count behavior selection.** Scribbler 3 has only one physical button (Reset), and beginner programs use 2×/3×/4× presses to invoke pre-defined behaviors. No generic simulator models this — they all assume real-time button input or scripted control. Forking a generic sim to support press-counts is a deeper change than greenfield.

- **The kid's mental model is BlocklyProp Solo.** The toolbox vocabulary (`drive_distance`, `rotate_degrees`, `line_sensor_*`, etc.) is specific to Parallax. Open Roberta uses NEPO (different block names); Gears uses its own DSL. Re-skinning either to match Solo block names is more work than implementing them in fresh Blockly.

- **2D top-down is the right fidelity.** The kid programs distances and rotations, not physics. A 3D engine like Gears adds complexity (camera, perspective, framerate budget) without practice value.

- **Static deploy.** A custom Vite+React app deploys to GitHub Pages or even a USB drive. Forking a Java/GWT app like Open Roberta means hosting a server.

- **Code comprehension.** When the kid asks "why didn't my robot turn", debugging a small custom codebase is cheaper than debugging a forked third-party engine.

- **Custom matches the parent's scope of intervention.** This is a parent-owned tool, not a school IT-supported one. A small custom codebase is the kind of thing one parent can maintain.

## Consequences

### Positive

- Tight match to the kid's existing mental model (Solo block vocabulary, press-count idiom)
- Static-deployable, runs offline once cached
- Codebase small enough to read end-to-end in a single sitting
- Easy to evolve post-competition (calibration mode, drawing mode, etc.)
- No license-compatibility worries (we own the code)

### Negative

- All bugs are ours — no upstream community to escalate to
- Differential-drive physics + collision math implemented from scratch (highest bug-risk surface in the project)
- No prior validation that our simulator transfers to real-robot performance — the kid will only verify at the competition itself

## Alternatives Considered

- **Open Roberta Lab fork** — rejected: Java/GWT, requires server hosting, doesn't model Scribbler-specific buttons or sensors, NEPO ≠ Solo vocabulary
- **Gears fork** — rejected: 3D engine overkill, no clean Blockly toolbox-customisation seam, performance risk on low-end laptop
- **Rocksi / BrowserBotics** — rejected: arms-oriented, not differential drive; smaller community; no Scribbler model
- **Scratch with custom sprite** — rejected: Scratch's block vocabulary differs from BlocklyProp Solo, breaking the transfer-to-class-skills value proposition

## Decision Trigger

Will revisit this ADR if any of the following occur:

- A community Scribbler 3 simulator is announced (none exists as of 2026-05-10)
- Custom physics develops bugs we can't fix in <2 days each
- The kid's class teacher offers their own training resources that supersede this tool
- Post-competition, scope expands to features genuinely better served by a 3D engine (e.g., pen-down drawing on a 3D-rendered surface)
