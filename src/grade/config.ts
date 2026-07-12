import type { Step } from '../sim/behaviors/schema';
import {
  classProgramSample,
  grade5ProgramSample,
  grade79ProgramSample,
  type StarterEntry,
} from '../sim/behaviors/starter';

/**
 * Grade-based competition modes, mirroring the real Robotraffic tiers:
 * - grade4: coarse grid, whole-cell drives, 90° turns (the original behavior)
 * - grade5: adds 45° rotation and diagonal-geometry boards
 * - grade79: line-following tracks with motor-level (tank) blocks
 *
 * This module is the single source of truth for everything that varies by
 * grade. It is pure (no React, no zustand, no i18n side effects) so it can
 * be unit-tested directly.
 */
export const GRADES = ['grade4', 'grade5', 'grade79'] as const;
export type Grade = (typeof GRADES)[number];

export interface ToolboxBlockEntry {
  /** Blockly block type — must exist in buildBlockDefinitions. */
  type: string;
  /** Preset field values, e.g. { DEGREES: 45 } for a pre-filled rotate block. */
  fields?: Record<string, number | string>;
}

export interface ToolboxCategory {
  /** i18n key for the category label, e.g. 'blocks.category_motion'. */
  labelKey: string;
  colour: number;
  blocks: readonly ToolboxBlockEntry[];
}

export interface GradeConfig {
  id: Grade;
  /** i18n key for the selector button label. */
  labelKey: string;
  /**
   * Heading snap applied when a program completes: snap to the nearest
   * multiple of this many degrees when within ±10°, otherwise round to a
   * whole degree. null = whole-degree rounding only (line-following programs
   * end at arbitrary headings that a coarse snap would corrupt).
   */
  snapIncrementDeg: number | null;
  toolbox: readonly ToolboxCategory[];
  starterProgram: readonly StarterEntry[];
  /** Bundled board ids offered in this grade (custom boards are always offered). */
  bundledBoardIds: readonly string[];
  /** Board to activate when switching to this grade excludes the current one. */
  defaultBoardId: string;
  /** Random-board (🎲) settings; null hides the button in this grade. */
  randomBoard: { connectivity: 4 | 8 } | null;
}

const soundCategory: ToolboxCategory = {
  labelKey: 'blocks.category_sound',
  colour: 60,
  blocks: [{ type: 'beep' }, { type: 'wait' }],
};

const loopsCategory: ToolboxCategory = {
  labelKey: 'blocks.category_loops',
  colour: 290,
  blocks: [{ type: 'repeat' }, { type: 'while_sensor' }, { type: 'while_not_sensor' }],
};

const sensorsCategory: ToolboxCategory = {
  labelKey: 'blocks.category_sensors',
  colour: 210,
  blocks: [{ type: 'if_sensor' }],
};

export const GRADE_CONFIGS: Record<Grade, GradeConfig> = {
  grade4: {
    id: 'grade4',
    labelKey: 'grade.grade4_label',
    snapIncrementDeg: 90,
    toolbox: [
      {
        labelKey: 'blocks.category_motion',
        colour: 220,
        // Owner decision (2026-07-12): hide the advanced motor-level blocks
        // (drive_wheels, drive_arc) from the youngest tier. The blocks stay
        // registered, so saved programs that use them still render and run.
        blocks: [{ type: 'drive_distance' }, { type: 'rotate_degrees' }, { type: 'stop' }],
      },
      soundCategory,
      loopsCategory,
      sensorsCategory,
    ],
    starterProgram: classProgramSample,
    bundledBoardIds: ['maze', 'default', 'default-bonus'],
    defaultBoardId: 'maze',
    randomBoard: { connectivity: 4 },
  },
  grade5: {
    id: 'grade5',
    labelKey: 'grade.grade5_label',
    snapIncrementDeg: 45,
    toolbox: [
      {
        labelKey: 'blocks.category_motion',
        colour: 220,
        blocks: [
          { type: 'drive_distance' },
          { type: 'rotate_degrees' },
          { type: 'rotate_degrees', fields: { DEGREES: 45 } },
          { type: 'stop' },
        ],
      },
      soundCategory,
      loopsCategory,
      sensorsCategory,
    ],
    starterProgram: grade5ProgramSample,
    bundledBoardIds: ['maze', 'default', 'default-bonus', 'diagonal'],
    defaultBoardId: 'diagonal',
    randomBoard: { connectivity: 8 },
  },
  grade79: {
    id: 'grade79',
    labelKey: 'grade.grade79_label',
    snapIncrementDeg: null,
    toolbox: [
      {
        labelKey: 'blocks.category_motion',
        colour: 220,
        blocks: [
          { type: 'drive_wheels' },
          { type: 'drive_arc' },
          { type: 'drive_distance' },
          { type: 'rotate_degrees' },
          { type: 'stop' },
        ],
      },
      soundCategory,
      loopsCategory,
      sensorsCategory,
    ],
    starterProgram: grade79ProgramSample,
    bundledBoardIds: ['track-figure8', 'track-serpentine'],
    defaultBoardId: 'track-figure8',
    randomBoard: null,
  },
};

export const DEFAULT_GRADE: Grade = 'grade4';

export const getGradeConfig = (grade: Grade): GradeConfig => GRADE_CONFIGS[grade];

export const isGrade = (v: unknown): v is Grade =>
  typeof v === 'string' && (GRADES as readonly string[]).includes(v);

/** The Blockly block type a step is edited with (whiles pick by predicate). */
const blockTypeForStep = (step: Step): string => {
  switch (step.kind) {
    case 'drive':
      return 'drive_distance';
    case 'rotate':
      return 'rotate_degrees';
    case 'while':
      return step.condition.kind === 'not' ? 'while_not_sensor' : 'while_sensor';
    case 'if':
      return 'if_sensor';
    default:
      return step.kind;
  }
};

const collectBlockTypes = (steps: readonly Step[], out: Set<string>): void => {
  for (const step of steps) {
    out.add(blockTypeForStep(step));
    if (step.kind === 'repeat' || step.kind === 'while') collectBlockTypes(step.body, out);
    if (step.kind === 'if') {
      collectBlockTypes(step.then, out);
      if (step.else) collectBlockTypes(step.else, out);
    }
  }
};

/**
 * Block types used by `steps` that are NOT in the grade's toolbox. Used by the
 * editor to show a non-blocking "this program uses hidden blocks" notice —
 * such programs still render, edit, and run (all blocks stay registered).
 */
export const stepKindsOutsideGrade = (steps: readonly Step[], config: GradeConfig): string[] => {
  const available = new Set(config.toolbox.flatMap((c) => c.blocks.map((b) => b.type)));
  const used = new Set<string>();
  collectBlockTypes(steps, used);
  return [...used].filter((type) => !available.has(type)).sort();
};
