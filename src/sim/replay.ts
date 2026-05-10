import type { Step } from './behaviors/schema';

export interface RunEvent {
  tickIndex: number;
  pressCount: number;
  steps: Step[];
}

export type RunOutcome = 'reached-goal' | 'stalled' | 'aborted';

export interface RunRecord {
  id: string;
  boardId: string;
  startedAt: number;
  durationMs: number;
  events: RunEvent[];
  outcome: RunOutcome;
  pressCountTotal: number;
  /** True if the robot passed through a bonus zone during the run. Optional for backwards-compat with pre-bonus run logs in localStorage. */
  bonusHit?: boolean;
}

export const newRunId = (): string => `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const sortEvents = (events: RunEvent[]): RunEvent[] =>
  [...events].sort((a, b) => a.tickIndex - b.tickIndex);
