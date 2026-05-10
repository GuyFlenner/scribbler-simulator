import type { BoardState } from './boards/schema';

export interface RobotState {
  x: number;
  y: number;
  // heading: radians. 0 = +x (east). Board uses screen coordinates with +y DOWN, so a
  // positive heading rotates the robot CLOCKWISE on screen — i.e. a "right turn" from
  // the kid's perspective. This matches Parallax BlocklyProp S3 convention (positive
  // rotate = right). Do NOT reason about this in math-convention CCW terms; the y-axis
  // flip means math-CCW becomes screen-CW.
  heading: number;
  vLinear: number;
  // vAngular: rad/s. Positive = clockwise on screen = right turn (see heading note).
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
