import type { BoardState } from './boards/schema';

export interface RobotState {
  x: number;
  y: number;
  heading: number;
  vLinear: number;
  vAngular: number;
  isStalled: boolean;
  encoderTicksLeft: number;
  encoderTicksRight: number;
}

export type SimStatus = 'idle' | 'running' | 'reached-goal' | 'stalled';

export interface SimState {
  robot: RobotState;
  board: BoardState;
  tickIndex: number;
  status: SimStatus;
  runStartedAt: number | null;
}

export const ROBOT_LENGTH_M = 0.19;
export const ROBOT_WIDTH_M = 0.16;
export const WHEEL_BASE_M = 0.105;
export const TICKS_PER_M = 340;
