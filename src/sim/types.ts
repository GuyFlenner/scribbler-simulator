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

// Visual + collision footprint. Sized to fit within one 10cm grid square; the
// elongated 9:6.5 ratio (vs near-square 19:16 before) makes heading direction
// unambiguous after a 90° turn.
export const ROBOT_LENGTH_M = 0.09;
export const ROBOT_WIDTH_M = 0.065;
// Wheel-base stays at the real S3's 10.5 cm — used by physics (encoder ticks,
// differential wheel speeds), not by the visual.
export const WHEEL_BASE_M = 0.105;
export const TICKS_PER_M = 340;
