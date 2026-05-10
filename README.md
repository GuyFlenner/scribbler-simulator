# Scribbler Simulator

Browser-based simulator for the Parallax Scribbler 3 (S3) robot. Built so an 8-year-old can practice for an Israeli school robotics competition without access to physical hardware.

## What it simulates

- Differential-drive physics on a 2D top-down board
- Press-count button actuation (the real S3 has only one physical Reset button; pressing it 2×/3×/4×… triggers different pre-programmed behaviors)
- Sensors: line-following, IR obstacle, encoder-based motion, light
- Bilingual UI: Hebrew (RTL) and English

## Why it exists

The Scribbler 3 is discontinued and Parallax never shipped a browser simulator for it. Existing block-programming sandboxes (Scratch, Open Roberta, Gears) don't model the Scribbler's specific button-press idiom, sensor layout, or competition format.

## Stack

- TypeScript + React 19 + Vite 6
- Blockly 11 (vocabulary mirrors [BlocklyProp Solo](https://learn.parallax.com/reference/scribbler-3-robot-block-reference/))
- HTML5 Canvas for the 2D top-down sim
- i18next for bilingual He/En UI
- Vitest + Testing Library

## Dev

```powershell
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm run test
npm run build
```

## SDLC framework

This project consumes Claude SDLC skills from `C:\code\claude-sdlc`. To refresh:

```powershell
.\scripts\sync-claude-skills.ps1 -DryRun  # preview
.\scripts\sync-claude-skills.ps1          # apply
```

See `claude-skills.lock` for the manifest and `C:\code\claude-sdlc\docs\skills-sharing.md` for the convention.

## Project status

- Created: 2026-05-10
- Target: usable practice tool by competition (mid-June 2026)
- Branching: working directly on `main` until further notice (no PRs)
