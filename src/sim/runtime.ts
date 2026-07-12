import type { Step } from './behaviors/schema';
import type { BoardState } from './boards/schema';
import { evalPredicate, readLineReflectivity } from './sensors';
import { TICKS_PER_M, WHEEL_BASE_M, type RobotState } from './types';

const DEFAULT_LINEAR_SPEED = 0.15;
const DEFAULT_ANGULAR_SPEED = Math.PI / 2;
const MAX_LINEAR_SPEED = 0.15;

export interface ProgramHandle {
  step(
    robot: RobotState,
    dtSeconds: number,
    board: BoardState,
  ): { vLinear: number; vAngular: number; done: boolean };
}

interface Context {
  robot: RobotState;
  board: BoardState;
  dtSeconds: number;
}

interface Velocities {
  vLinear: number;
  vAngular: number;
}

const ZERO: Velocities = { vLinear: 0, vAngular: 0 };

function* executeDrive(
  step: { kind: 'drive'; cm: number; speed?: number },
  ctx: Context,
): Generator<Velocities> {
  const distanceM = Math.abs(step.cm) / 100;
  const direction = step.cm >= 0 ? 1 : -1;
  const speed = (step.speed ?? DEFAULT_LINEAR_SPEED) * direction;
  const targetTicks = distanceM * TICKS_PER_M;
  const startLeft = ctx.robot.encoderTicksLeft;
  const startRight = ctx.robot.encoderTicksRight;
  while (true) {
    if (ctx.robot.isStalled) return;
    const leftDelta = Math.abs(ctx.robot.encoderTicksLeft - startLeft);
    const rightDelta = Math.abs(ctx.robot.encoderTicksRight - startRight);
    const avgDelta = (leftDelta + rightDelta) / 2;
    if (avgDelta >= targetTicks) return;
    const remainingM = (targetTicks - avgDelta) / TICKS_PER_M;
    // On the final tick, yield a proportional linear speed so the robot lands
    // exactly on the target distance instead of overshooting by a full tick-step.
    // Mirrors the corrective-velocity pattern in executeRotate.
    if (remainingM < Math.abs(speed) * ctx.dtSeconds) {
      yield { vLinear: (remainingM / ctx.dtSeconds) * direction, vAngular: 0 };
      return;
    }
    yield { vLinear: speed, vAngular: 0 };
  }
}

function* executeDriveWheels(
  step: { kind: 'drive_wheels'; leftSpeedPct: number; rightSpeedPct: number; durationMs: number },
  ctx: Context,
): Generator<Velocities> {
  const clamp = (v: number): number => Math.max(-100, Math.min(100, v));
  const leftMps = (clamp(step.leftSpeedPct) / 100) * MAX_LINEAR_SPEED;
  const rightMps = (clamp(step.rightSpeedPct) / 100) * MAX_LINEAR_SPEED;
  const vLinear = (leftMps + rightMps) / 2;
  const vAngular = (rightMps - leftMps) / WHEEL_BASE_M;
  const targetSeconds = Math.max(0, step.durationMs) / 1000;
  let elapsed = 0;
  while (elapsed < targetSeconds) {
    if (ctx.robot.isStalled) return;
    yield { vLinear, vAngular };
    elapsed += ctx.dtSeconds;
  }
}

// Proportional line follower (uses the analog 0-100 reflectivity sensors —
// real S3 semantics). Steering is proportional to the left/right reflectivity
// difference, and forward speed eases off in proportion to the error, so the
// robot corners smoothly instead of bang-bang zig-zagging. Gains are pinned
// by grade79-follower.validation.test.ts — tune there, not by eye.
const FOLLOW_TURN_GAIN_RAD_S = 2.5;
const FOLLOW_SLOWDOWN_FACTOR = 0.6;
const FOLLOW_LINE_LOST_TIMEOUT_S = 1;

function* executeFollowLine(
  step: { kind: 'follow_line'; speedPct: number; seconds: number },
  ctx: Context,
): Generator<Velocities> {
  const clampPct = Math.max(0, Math.min(100, step.speedPct));
  const speed = (clampPct / 100) * MAX_LINEAR_SPEED;
  let elapsed = 0;
  let lostSeconds = 0;
  while (elapsed < step.seconds) {
    if (ctx.robot.isStalled) return;
    const { left, right } = readLineReflectivity(ctx.robot, ctx.board);
    if (left === 0 && right === 0) {
      // Fully off the line: keep last-resort straight travel briefly, then
      // stop rather than wander the board forever.
      lostSeconds += ctx.dtSeconds;
      if (lostSeconds >= FOLLOW_LINE_LOST_TIMEOUT_S) {
        yield ZERO;
        return;
      }
    } else {
      lostSeconds = 0;
    }
    // + error → line is toward the left sensor (+y local) → steer +.
    const error = (left - right) / 100;
    yield {
      vLinear: speed * (1 - FOLLOW_SLOWDOWN_FACTOR * Math.abs(error)),
      vAngular: FOLLOW_TURN_GAIN_RAD_S * error,
    };
    elapsed += ctx.dtSeconds;
  }
}

function* executeDriveArc(
  step: { kind: 'drive_arc'; radiusCm: number; degrees: number; speedPct?: number },
  ctx: Context,
): Generator<Velocities> {
  const radians = (step.degrees * Math.PI) / 180;
  const radiusM = Math.abs(step.radiusCm) / 100;
  const speed = ((step.speedPct ?? 100) / 100) * MAX_LINEAR_SPEED;
  if (Math.abs(radians) === 0) return;
  const targetAngleDelta = Math.abs(radians);
  const startHeading = ctx.robot.heading;

  if (radiusM === 0) {
    const angSpeed = DEFAULT_ANGULAR_SPEED * Math.sign(radians);
    while (Math.abs(ctx.robot.heading - startHeading) < targetAngleDelta) {
      if (ctx.robot.isStalled) return;
      yield { vLinear: 0, vAngular: angSpeed };
    }
    return;
  }

  const direction = Math.sign(radians);
  const vLinear = speed;
  const vAngular = direction * (vLinear / radiusM);
  while (Math.abs(ctx.robot.heading - startHeading) < targetAngleDelta) {
    if (ctx.robot.isStalled) return;
    yield { vLinear, vAngular };
  }
}

function* executeRotate(
  step: { kind: 'rotate'; degrees: number; speed?: number },
  ctx: Context,
): Generator<Velocities> {
  const radians = (Math.abs(step.degrees) * Math.PI) / 180;
  const direction = step.degrees >= 0 ? 1 : -1;
  const speed = (step.speed ?? DEFAULT_ANGULAR_SPEED) * direction;
  const startHeading = ctx.robot.heading;
  while (true) {
    if (ctx.robot.isStalled) return;
    const delta = Math.abs(ctx.robot.heading - startHeading);
    if (delta >= radians) return;
    const remaining = radians - delta;
    // On the final tick, yield a proportional angular speed so the robot lands
    // exactly on the target heading instead of overshooting by a full tick-step.
    // The sim-store's degree snap removes any residual sub-degree error afterwards.
    if (remaining < Math.abs(speed) * ctx.dtSeconds) {
      yield { vLinear: 0, vAngular: (remaining / ctx.dtSeconds) * direction };
      return;
    }
    yield { vLinear: 0, vAngular: speed };
  }
}

function* executeWait(
  step: { kind: 'wait'; seconds: number },
  ctx: Context,
): Generator<Velocities> {
  let elapsed = 0;
  while (elapsed < step.seconds) {
    yield ZERO;
    elapsed += ctx.dtSeconds;
  }
}

function* executeSequence(steps: Step[], ctx: Context): Generator<Velocities> {
  for (const step of steps) {
    yield* executeStep(step, ctx);
    if (ctx.robot.isStalled) return;
  }
}

function* executeStep(step: Step, ctx: Context): Generator<Velocities> {
  switch (step.kind) {
    case 'drive':
      yield* executeDrive(step, ctx);
      return;
    case 'drive_wheels':
      yield* executeDriveWheels(step, ctx);
      return;
    case 'follow_line':
      yield* executeFollowLine(step, ctx);
      return;
    case 'drive_arc':
      yield* executeDriveArc(step, ctx);
      return;
    case 'rotate':
      yield* executeRotate(step, ctx);
      return;
    case 'wait':
      yield* executeWait(step, ctx);
      return;
    case 'stop':
      yield ZERO;
      return;
    case 'beep':
      return;
    case 'if': {
      const cond = evalPredicate(step.condition, ctx.robot, ctx.board);
      if (cond) {
        yield* executeSequence(step.then, ctx);
      } else if (step.else) {
        yield* executeSequence(step.else, ctx);
      }
      return;
    }
    case 'while': {
      let iter = 0;
      while (iter < step.maxIterations && evalPredicate(step.condition, ctx.robot, ctx.board)) {
        yield* executeSequence(step.body, ctx);
        if (ctx.robot.isStalled) return;
        iter += 1;
      }
      return;
    }
    case 'repeat': {
      const times = Math.max(0, Math.floor(step.times));
      for (let i = 0; i < times; i++) {
        yield* executeSequence(step.body, ctx);
        if (ctx.robot.isStalled) return;
      }
      return;
    }
  }
}

const blankBoard: BoardState = {
  version: 1,
  id: 'blank',
  name: 'blank',
  width: 1,
  height: 1,
  elements: [],
};

export function startProgram(steps: Step[]): ProgramHandle {
  const ctx: Context = {
    robot: {
      x: 0,
      y: 0,
      heading: 0,
      vLinear: 0,
      vAngular: 0,
      isStalled: false,
      encoderTicksLeft: 0,
      encoderTicksRight: 0,
    },
    board: blankBoard,
    dtSeconds: 1 / 60,
  };
  const gen = executeSequence(steps, ctx);

  return {
    step(robot, dtSeconds, board) {
      ctx.robot = robot;
      ctx.dtSeconds = dtSeconds;
      ctx.board = board;
      const r = gen.next();
      if (r.done) return { vLinear: 0, vAngular: 0, done: true };
      return { vLinear: r.value.vLinear, vAngular: r.value.vAngular, done: false };
    },
  };
}
