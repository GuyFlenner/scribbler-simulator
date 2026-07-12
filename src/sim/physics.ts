import type { BoardState } from './boards/schema';
import { boardWallSegments, distPointToSegment } from './geometry';
import {
  ROBOT_COLLISION_RADIUS_M,
  ROBOT_LENGTH_M,
  ROBOT_WIDTH_M,
  TICKS_PER_M,
  WHEEL_BASE_M,
  type RobotState,
  type SimState,
  type SimStatus,
} from './types';

const ROBOT_HALF_LENGTH = ROBOT_LENGTH_M / 2;
const ROBOT_HALF_WIDTH = ROBOT_WIDTH_M / 2;

export function makeRobotState(init: Partial<RobotState> = {}): RobotState {
  return {
    x: 0,
    y: 0,
    heading: 0,
    vLinear: 0,
    vAngular: 0,
    isStalled: false,
    encoderTicksLeft: 0,
    encoderTicksRight: 0,
    ...init,
  };
}

export interface CollisionResult {
  hit: boolean;
}

const robotBbox = (
  robot: RobotState,
): { minX: number; minY: number; maxX: number; maxY: number } => ({
  minX: robot.x - ROBOT_HALF_LENGTH,
  minY: robot.y - ROBOT_HALF_WIDTH,
  maxX: robot.x + ROBOT_HALF_LENGTH,
  maxY: robot.y + ROBOT_HALF_WIDTH,
});

export function detectCollision(robot: RobotState, board: BoardState): CollisionResult {
  const rb = robotBbox(robot);
  for (const el of board.elements) {
    if (el.kind !== 'obstacle') continue;
    const ob = { minX: el.x, minY: el.y, maxX: el.x + el.w, maxY: el.y + el.h };
    if (rb.minX < ob.maxX && rb.maxX > ob.minX && rb.minY < ob.maxY && rb.maxY > ob.minY) {
      return { hit: true };
    }
  }
  // Diagonal walls and corner-cut hypotenuses (grade-5 boards): capsule test —
  // robot approximated as a circle around its centre. Grade-4 boards have no
  // such elements, so this loop body never runs for them.
  for (const seg of boardWallSegments(board)) {
    const dist = distPointToSegment(robot.x, robot.y, seg.x1, seg.y1, seg.x2, seg.y2);
    if (dist <= seg.thickness / 2 + ROBOT_COLLISION_RADIUS_M) {
      return { hit: true };
    }
  }
  return { hit: false };
}

// Tolerance for the boundary check: a drive that ends exactly on the board
// edge can land a few 1e-16 outside it from float accumulation — that must
// not read as out-of-bounds (surfaced when TICKS_PER_M changed the final-tick
// float pattern of executeDrive).
const OOB_EPSILON_M = 1e-9;

function isOutOfBounds(robot: RobotState, board: BoardState): boolean {
  // Check robot centre — not the full bbox — so a robot placed near the edge
  // by the start marker doesn't immediately stall. Only the robot's travel
  // past the board boundary triggers a stall.
  return (
    robot.x < -OOB_EPSILON_M ||
    robot.x > board.width + OOB_EPSILON_M ||
    robot.y < -OOB_EPSILON_M ||
    robot.y > board.height + OOB_EPSILON_M
  );
}

export function tick(state: SimState, dtSeconds: number): SimState {
  if (state.status === 'reached-goal' || state.status === 'stalled') {
    return { ...state, tickIndex: state.tickIndex + 1 };
  }

  const r = state.robot;
  const cosH = Math.cos(r.heading);
  const sinH = Math.sin(r.heading);
  const candidate: RobotState = {
    ...r,
    x: r.x + r.vLinear * cosH * dtSeconds,
    y: r.y + r.vLinear * sinH * dtSeconds,
    heading: r.heading + r.vAngular * dtSeconds,
  };

  const collision = detectCollision(candidate, state.board);
  const oob = isOutOfBounds(candidate, state.board);
  if (collision.hit || oob) {
    return {
      ...state,
      robot: {
        ...r,
        heading: candidate.heading,
        vLinear: 0,
        vAngular: 0,
        isStalled: true,
      },
      status: 'stalled',
      tickIndex: state.tickIndex + 1,
    };
  }

  const vLeft = r.vLinear - (r.vAngular * WHEEL_BASE_M) / 2;
  const vRight = r.vLinear + (r.vAngular * WHEEL_BASE_M) / 2;
  const advanced: RobotState = {
    ...candidate,
    encoderTicksLeft: r.encoderTicksLeft + vLeft * dtSeconds * TICKS_PER_M,
    encoderTicksRight: r.encoderTicksRight + vRight * dtSeconds * TICKS_PER_M,
  };

  let nextStatus: SimStatus = state.status;
  if (state.status === 'running') {
    const goal = state.board.elements.find((el) => el.kind === 'goal');
    if (goal && goal.kind === 'goal') {
      const dx = advanced.x - goal.x;
      const dy = advanced.y - goal.y;
      if (Math.hypot(dx, dy) <= goal.toleranceCm / 100) {
        nextStatus = 'reached-goal';
      }
    }
  }

  return {
    ...state,
    robot: advanced,
    status: nextStatus,
    tickIndex: state.tickIndex + 1,
  };
}
