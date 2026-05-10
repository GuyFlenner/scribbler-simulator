import type { Step } from './behaviors/schema';
import { TICKS_PER_M, type RobotState } from './types';

const DEFAULT_LINEAR_SPEED = 0.15;
const DEFAULT_ANGULAR_SPEED = Math.PI / 2;

interface RuntimeContext {
  steps: Step[];
  index: number;
  startEncoderLeft: number;
  startEncoderRight: number;
  startHeading: number;
  targetEncoderDelta: number;
  targetHeadingDelta: number;
  waitElapsedSeconds: number;
  waitDurationSeconds: number;
}

export interface ProgramHandle {
  isComplete(): boolean;
  step(robot: RobotState, dtSeconds: number): { vLinear: number; vAngular: number; done: boolean };
}

export function startProgram(steps: Step[]): ProgramHandle {
  const ctx: RuntimeContext = {
    steps,
    index: -1,
    startEncoderLeft: 0,
    startEncoderRight: 0,
    startHeading: 0,
    targetEncoderDelta: 0,
    targetHeadingDelta: 0,
    waitElapsedSeconds: 0,
    waitDurationSeconds: 0,
  };

  let pendingStart = true;

  const beginStep = (robot: RobotState): { vLinear: number; vAngular: number } => {
    const step = ctx.steps[ctx.index];
    if (!step) return { vLinear: 0, vAngular: 0 };
    switch (step.kind) {
      case 'drive': {
        const distanceM = step.cm / 100;
        const speed = step.speed ?? DEFAULT_LINEAR_SPEED;
        ctx.startEncoderLeft = robot.encoderTicksLeft;
        ctx.startEncoderRight = robot.encoderTicksRight;
        ctx.targetEncoderDelta = Math.abs(distanceM) * TICKS_PER_M;
        return { vLinear: distanceM >= 0 ? speed : -speed, vAngular: 0 };
      }
      case 'rotate': {
        const radians = (step.degrees * Math.PI) / 180;
        const speed = step.speed ?? DEFAULT_ANGULAR_SPEED;
        ctx.startHeading = robot.heading;
        ctx.targetHeadingDelta = Math.abs(radians);
        return { vLinear: 0, vAngular: radians >= 0 ? speed : -speed };
      }
      case 'wait': {
        ctx.waitElapsedSeconds = 0;
        ctx.waitDurationSeconds = step.seconds;
        return { vLinear: 0, vAngular: 0 };
      }
      case 'stop':
      case 'beep':
      case 'set_led':
      case 'if':
      case 'while':
      case 'repeat':
        return { vLinear: 0, vAngular: 0 };
    }
  };

  return {
    isComplete: () => ctx.index >= ctx.steps.length,
    step(robot: RobotState, dtSeconds: number) {
      if (pendingStart) {
        ctx.index = 0;
        pendingStart = false;
        if (ctx.steps.length === 0) return { vLinear: 0, vAngular: 0, done: true };
        const v = beginStep(robot);
        return { ...v, done: false };
      }

      if (ctx.index >= ctx.steps.length) {
        return { vLinear: 0, vAngular: 0, done: true };
      }

      const step = ctx.steps[ctx.index];

      let stepDone = false;
      switch (step.kind) {
        case 'drive': {
          const avgTicks =
            (Math.abs(robot.encoderTicksLeft - ctx.startEncoderLeft) +
              Math.abs(robot.encoderTicksRight - ctx.startEncoderRight)) /
            2;
          if (avgTicks >= ctx.targetEncoderDelta) stepDone = true;
          break;
        }
        case 'rotate': {
          const headingDelta = Math.abs(robot.heading - ctx.startHeading);
          if (headingDelta >= ctx.targetHeadingDelta) stepDone = true;
          break;
        }
        case 'wait': {
          ctx.waitElapsedSeconds += dtSeconds;
          if (ctx.waitElapsedSeconds >= ctx.waitDurationSeconds) stepDone = true;
          break;
        }
        case 'stop':
        case 'beep':
        case 'set_led':
        case 'if':
        case 'while':
        case 'repeat':
          stepDone = true;
          break;
      }

      if (robot.isStalled) {
        ctx.index = ctx.steps.length;
        return { vLinear: 0, vAngular: 0, done: true };
      }

      if (stepDone) {
        ctx.index += 1;
        if (ctx.index >= ctx.steps.length) {
          return { vLinear: 0, vAngular: 0, done: true };
        }
        const v = beginStep(robot);
        return { ...v, done: false };
      }

      const current = step;
      switch (current.kind) {
        case 'drive': {
          const distanceM = current.cm / 100;
          const speed = current.speed ?? DEFAULT_LINEAR_SPEED;
          return {
            vLinear: distanceM >= 0 ? speed : -speed,
            vAngular: 0,
            done: false,
          };
        }
        case 'rotate': {
          const radians = (current.degrees * Math.PI) / 180;
          const speed = current.speed ?? DEFAULT_ANGULAR_SPEED;
          return {
            vLinear: 0,
            vAngular: radians >= 0 ? speed : -speed,
            done: false,
          };
        }
        default:
          return { vLinear: 0, vAngular: 0, done: false };
      }
    },
  };
}
