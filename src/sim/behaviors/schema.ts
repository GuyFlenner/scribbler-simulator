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
  | { kind: 'drive_arc'; radiusCm: number; degrees: number; speedPct?: number }
  | { kind: 'rotate'; degrees: number; speed?: number }
  | { kind: 'stop' }
  | { kind: 'beep'; durationMs: number; freqHz?: number }
  | { kind: 'set_led'; led: 'left' | 'centre' | 'right'; r: number; g: number }
  | { kind: 'wait'; seconds: number }
  | { kind: 'if'; condition: SensorPredicate; then: Step[]; else?: Step[] }
  | { kind: 'while'; condition: SensorPredicate; body: Step[]; maxIterations: number }
  | { kind: 'repeat'; times: number; body: Step[] };

export interface Behavior {
  pressCount: number;
  label: string;
  steps: Step[];
}

export interface Program {
  version: 1;
  behaviors: Behavior[];
}
