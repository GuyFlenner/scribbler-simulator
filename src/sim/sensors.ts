import type { BoardState } from './boards/schema';
import type { SensorPredicate } from './behaviors/schema';
import {
  boardWallSegments,
  closestPointOnSegment,
  distPointToRect,
  distPointToSegment,
} from './geometry';
import { ROBOT_LENGTH_M, type RobotState } from './types';

const LINE_SENSOR_LATERAL_OFFSET_M = 0.03;
const IR_SENSOR_RANGE_M = 0.15;
const IR_SENSOR_HALF_CONE_RAD = (30 * Math.PI) / 180;
const LIGHT_HALF_CONE_RAD = (45 * Math.PI) / 180;

const localToWorld = (
  robot: RobotState,
  localX: number,
  localY: number,
): { x: number; y: number } => {
  const cosH = Math.cos(robot.heading);
  const sinH = Math.sin(robot.heading);
  return {
    x: robot.x + localX * cosH - localY * sinH,
    y: robot.y + localX * sinH + localY * cosH,
  };
};

const normaliseAngle = (a: number): number => {
  let r = a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
};

const sensorOverLine = (sensorX: number, sensorY: number, board: BoardState): boolean => {
  for (const el of board.elements) {
    if (el.kind !== 'line') continue;
    const dist = distPointToSegment(sensorX, sensorY, el.x1, el.y1, el.x2, el.y2);
    if (dist <= el.thickness / 2) return true;
  }
  return false;
};

// The real S3 line sensor returns 0-100 analog reflectivity, not a boolean.
// Model: the sensor reads a spot of this radius; reflectivity ramps linearly
// from 100 (spot fully over the line) to 0 (spot fully off it) as the spot
// crosses the line edge. The boolean sensors above keep their original exact
// thickness/2 threshold — analog is an additional view, not a replacement.
const LINE_SENSOR_SPOT_RADIUS_M = 0.01;

const reflectivityAt = (sensorX: number, sensorY: number, board: BoardState): number => {
  let best = 0;
  for (const el of board.elements) {
    if (el.kind !== 'line') continue;
    const dist = distPointToSegment(sensorX, sensorY, el.x1, el.y1, el.x2, el.y2);
    const ramp =
      (el.thickness / 2 + LINE_SENSOR_SPOT_RADIUS_M - dist) / (2 * LINE_SENSOR_SPOT_RADIUS_M);
    best = Math.max(best, Math.min(1, Math.max(0, ramp)));
  }
  return best * 100;
};

/** Analog 0-100 reflectivity for the left/right line sensors (real S3 semantics). */
export function readLineReflectivity(
  robot: RobotState,
  board: BoardState,
): { left: number; right: number } {
  const leftPoint = localToWorld(robot, ROBOT_LENGTH_M / 2, LINE_SENSOR_LATERAL_OFFSET_M);
  const rightPoint = localToWorld(robot, ROBOT_LENGTH_M / 2, -LINE_SENSOR_LATERAL_OFFSET_M);
  return {
    left: reflectivityAt(leftPoint.x, leftPoint.y, board),
    right: reflectivityAt(rightPoint.x, rightPoint.y, board),
  };
}

export function readLineSensorLeft(robot: RobotState, board: BoardState): boolean {
  const p = localToWorld(robot, ROBOT_LENGTH_M / 2, LINE_SENSOR_LATERAL_OFFSET_M);
  return sensorOverLine(p.x, p.y, board);
}

export function readLineSensorRight(robot: RobotState, board: BoardState): boolean {
  const p = localToWorld(robot, ROBOT_LENGTH_M / 2, -LINE_SENSOR_LATERAL_OFFSET_M);
  return sensorOverLine(p.x, p.y, board);
}

const readObstacleSide = (
  robot: RobotState,
  board: BoardState,
  side: 'left' | 'right',
): boolean => {
  const front = localToWorld(robot, ROBOT_LENGTH_M / 2, 0);
  for (const el of board.elements) {
    if (el.kind !== 'obstacle') continue;
    const dist = distPointToRect(front.x, front.y, el.x, el.y, el.w, el.h);
    if (dist > IR_SENSOR_RANGE_M) continue;
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    const angleToCentre = Math.atan2(cy - front.y, cx - front.x);
    const rel = normaliseAngle(angleToCentre - robot.heading);
    if (Math.abs(rel) > IR_SENSOR_HALF_CONE_RAD) continue;
    if (side === 'left' && rel >= 0) return true;
    if (side === 'right' && rel <= 0) return true;
  }
  // Diagonal walls / corner-cut hypotenuses reflect IR like obstacles do —
  // grade-5 kids need to sense the boundaries they must not cross. Bearing is
  // taken to the closest point on the segment (a wall has no meaningful centre).
  for (const seg of boardWallSegments(board)) {
    const dist = distPointToSegment(front.x, front.y, seg.x1, seg.y1, seg.x2, seg.y2);
    if (dist > IR_SENSOR_RANGE_M) continue;
    const closest = closestPointOnSegment(front.x, front.y, seg.x1, seg.y1, seg.x2, seg.y2);
    const angleToWall = Math.atan2(closest.y - front.y, closest.x - front.x);
    const rel = normaliseAngle(angleToWall - robot.heading);
    if (Math.abs(rel) > IR_SENSOR_HALF_CONE_RAD) continue;
    if (side === 'left' && rel >= 0) return true;
    if (side === 'right' && rel <= 0) return true;
  }
  return false;
};

export function readObstacleLeft(robot: RobotState, board: BoardState): boolean {
  return readObstacleSide(robot, board, 'left');
}

export function readObstacleRight(robot: RobotState, board: BoardState): boolean {
  return readObstacleSide(robot, board, 'right');
}

export function readLightSensor(robot: RobotState, board: BoardState): number {
  let total = 0;
  for (const el of board.elements) {
    if (el.kind !== 'light') continue;
    const dx = el.x - robot.x;
    const dy = el.y - robot.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      total += 255;
      continue;
    }
    const angleToLight = Math.atan2(dy, dx);
    const rel = normaliseAngle(angleToLight - robot.heading);
    if (Math.abs(rel) > LIGHT_HALF_CONE_RAD) continue;
    const distCm = dist * 100;
    total += (el.intensity * 100) / (distCm * distCm + 1);
  }
  return Math.min(255, Math.max(0, total));
}

export function evalPredicate(
  pred: SensorPredicate,
  robot: RobotState,
  board: BoardState,
): boolean {
  switch (pred.kind) {
    case 'line_left':
      return readLineSensorLeft(robot, board);
    case 'line_right':
      return readLineSensorRight(robot, board);
    case 'obstacle_left':
      return readObstacleLeft(robot, board);
    case 'obstacle_right':
      return readObstacleRight(robot, board);
    case 'light_above':
      return readLightSensor(robot, board) > pred.threshold;
    case 'not':
      return !evalPredicate(pred.inner, robot, board);
    case 'and':
      return evalPredicate(pred.left, robot, board) && evalPredicate(pred.right, robot, board);
    case 'or':
      return evalPredicate(pred.left, robot, board) || evalPredicate(pred.right, robot, board);
  }
}
