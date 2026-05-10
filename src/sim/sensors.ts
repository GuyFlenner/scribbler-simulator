import type { BoardState } from './boards/schema';
import type { SensorPredicate } from './behaviors/schema';
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

const distPointToSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

const distPointToRect = (
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): number => {
  const cx = Math.max(rx, Math.min(px, rx + rw));
  const cy = Math.max(ry, Math.min(py, ry + rh));
  return Math.hypot(px - cx, py - cy);
};

const normaliseAngle = (a: number): number => {
  let r = a;
  while (r > Math.PI) r -= 2 * Math.PI;
  while (r < -Math.PI) r += 2 * Math.PI;
  return r;
};

const sensorOverLine = (
  sensorX: number,
  sensorY: number,
  board: BoardState,
): boolean => {
  for (const el of board.elements) {
    if (el.kind !== 'line') continue;
    const dist = distPointToSegment(sensorX, sensorY, el.x1, el.y1, el.x2, el.y2);
    if (dist <= el.thickness / 2) return true;
  }
  return false;
};

export function readLineSensorLeft(robot: RobotState, board: BoardState): boolean {
  const p = localToWorld(robot, ROBOT_LENGTH_M / 2, LINE_SENSOR_LATERAL_OFFSET_M);
  return sensorOverLine(p.x, p.y, board);
}

export function readLineSensorRight(robot: RobotState, board: BoardState): boolean {
  const p = localToWorld(robot, ROBOT_LENGTH_M / 2, -LINE_SENSOR_LATERAL_OFFSET_M);
  return sensorOverLine(p.x, p.y, board);
}

const readObstacleSide = (robot: RobotState, board: BoardState, side: 'left' | 'right'): boolean => {
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
