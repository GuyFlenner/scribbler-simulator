import type { Step } from './behaviors/schema';
import type { BoardState } from './boards/schema';
import { evalPredicate } from './sensors';
import { TICKS_PER_M, type RobotState } from './types';

const DEFAULT_LINEAR_SPEED = 0.15;
const DEFAULT_ANGULAR_SPEED = Math.PI / 2;

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

function* executeDrive(step: { kind: 'drive'; cm: number; speed?: number }, ctx: Context): Generator<Velocities> {
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
    if ((leftDelta + rightDelta) / 2 >= targetTicks) return;
    yield { vLinear: speed, vAngular: 0 };
  }
}

function* executeRotate(step: { kind: 'rotate'; degrees: number; speed?: number }, ctx: Context): Generator<Velocities> {
  const radians = (Math.abs(step.degrees) * Math.PI) / 180;
  const direction = step.degrees >= 0 ? 1 : -1;
  const speed = (step.speed ?? DEFAULT_ANGULAR_SPEED) * direction;
  const startHeading = ctx.robot.heading;
  while (true) {
    if (ctx.robot.isStalled) return;
    if (Math.abs(ctx.robot.heading - startHeading) >= radians) return;
    yield { vLinear: 0, vAngular: speed };
  }
}

function* executeWait(step: { kind: 'wait'; seconds: number }, ctx: Context): Generator<Velocities> {
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
    case 'set_led':
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
      while (
        iter < step.maxIterations &&
        evalPredicate(step.condition, ctx.robot, ctx.board)
      ) {
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
