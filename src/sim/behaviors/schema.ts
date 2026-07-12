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
  | { kind: 'drive_wheels'; leftSpeedPct: number; rightSpeedPct: number; durationMs: number }
  | { kind: 'follow_line'; speedPct: number; seconds: number }
  | { kind: 'drive_arc'; radiusCm: number; degrees: number; speedPct?: number }
  | { kind: 'rotate'; degrees: number; speed?: number }
  | { kind: 'stop' }
  | { kind: 'beep'; durationMs: number; freqHz?: number }
  | { kind: 'wait'; seconds: number }
  | { kind: 'if'; condition: SensorPredicate; then: Step[]; else?: Step[] }
  | { kind: 'while'; condition: SensorPredicate; body: Step[]; maxIterations: number }
  | { kind: 'repeat'; times: number; body: Step[] };

export interface Behavior {
  pressCount: number;
  label: string;
  steps: Step[];
  /**
   * The exact Blockly workspace JSON the steps were compiled from, when known.
   * Persisting it lets the editor restore the workspace losslessly; without it
   * the workspace is regenerated from steps (lossy for and/or/light_above).
   */
  workspaceJson?: unknown;
}

export interface Program {
  version: 1;
  behaviors: Behavior[];
}
