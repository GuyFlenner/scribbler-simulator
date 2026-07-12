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
// Circle approximation of the robot footprint used for wall/corner (segment)
// collision — the mean of half-length and half-width. Tunable: raise for
// stricter boundaries, lower to let the robot hug walls closer. Rectangular
// obstacles keep the original AABB check (grade-4 behavior untouched).
export const ROBOT_COLLISION_RADIUS_M = (ROBOT_LENGTH_M + ROBOT_WIDTH_M) / 4;
// Calibrated against Parallax's own S3 driver (scribbler.spin):
// DEFAULT_WHEEL_SPACE = 153 → wheel-to-wheel spacing 0.153 m, and ~0.5 mm per
// encoder count → ~2019 ticks/m (507.4 counts/rev over an ~8 cm wheel).
// Used by physics (encoder ticks, differential wheel speeds), not the visual.
// Fixed 2026-07-12 from 0.105/340 — drive_wheels steering was ~46% too fast.
export const WHEEL_BASE_M = 0.153;
export const TICKS_PER_M = 2019;
