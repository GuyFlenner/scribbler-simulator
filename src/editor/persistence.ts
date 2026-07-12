import type { Behavior, Program, SensorPredicate, Step } from '../sim/behaviors/schema';

export const STORAGE_KEY = 'scribbler-sim:programs:v1';

const fail = (msg: string): never => {
  throw new Error(`validateProgram: ${msg}`);
};

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const validatePredicate = (raw: unknown): SensorPredicate => {
  if (!isObject(raw)) return fail('predicate is not an object');
  const kind = raw.kind;
  switch (kind) {
    case 'line_left':
    case 'line_right':
    case 'obstacle_left':
    case 'obstacle_right':
      return { kind };
    case 'light_above': {
      if (!isFiniteNumber(raw.threshold)) return fail('light_above.threshold must be a number');
      return { kind, threshold: raw.threshold };
    }
    case 'not':
      return { kind, inner: validatePredicate(raw.inner) };
    case 'and':
    case 'or':
      return { kind, left: validatePredicate(raw.left), right: validatePredicate(raw.right) };
    default:
      return fail(`unknown predicate kind: ${String(kind)}`);
  }
};

const validateSteps = (raw: unknown): Step[] => {
  if (!Array.isArray(raw)) return fail('steps must be an array');
  return raw.map(validateStep);
};

const validateStep = (raw: unknown): Step => {
  if (!isObject(raw)) return fail('step is not an object');
  const kind = raw.kind;
  switch (kind) {
    case 'drive': {
      if (!isFiniteNumber(raw.cm)) return fail('drive.cm must be numeric');
      const out: Step = { kind: 'drive', cm: raw.cm };
      if (isFiniteNumber(raw.speed)) out.speed = raw.speed;
      return out;
    }
    case 'drive_wheels': {
      if (
        !isFiniteNumber(raw.leftSpeedPct) ||
        !isFiniteNumber(raw.rightSpeedPct) ||
        !isFiniteNumber(raw.durationMs)
      ) {
        return fail('drive_wheels requires numeric leftSpeedPct, rightSpeedPct, durationMs');
      }
      return {
        kind: 'drive_wheels',
        leftSpeedPct: raw.leftSpeedPct,
        rightSpeedPct: raw.rightSpeedPct,
        durationMs: raw.durationMs,
      };
    }
    case 'drive_arc': {
      if (!isFiniteNumber(raw.radiusCm) || !isFiniteNumber(raw.degrees)) {
        return fail('drive_arc requires numeric radiusCm, degrees');
      }
      const out: Step = { kind: 'drive_arc', radiusCm: raw.radiusCm, degrees: raw.degrees };
      if (isFiniteNumber(raw.speedPct)) out.speedPct = raw.speedPct;
      return out;
    }
    case 'rotate': {
      if (!isFiniteNumber(raw.degrees)) return fail('rotate.degrees must be numeric');
      const out: Step = { kind: 'rotate', degrees: raw.degrees };
      if (isFiniteNumber(raw.speed)) out.speed = raw.speed;
      return out;
    }
    case 'stop':
      return { kind: 'stop' };
    case 'beep': {
      if (!isFiniteNumber(raw.durationMs)) return fail('beep.durationMs must be numeric');
      const out: Step = { kind: 'beep', durationMs: raw.durationMs };
      if (isFiniteNumber(raw.freqHz)) out.freqHz = raw.freqHz;
      return out;
    }
    case 'wait': {
      if (!isFiniteNumber(raw.seconds)) return fail('wait.seconds must be numeric');
      return { kind: 'wait', seconds: raw.seconds };
    }
    case 'if': {
      const out: Step = {
        kind: 'if',
        condition: validatePredicate(raw.condition),
        then: validateSteps(raw.then),
      };
      if (raw.else !== undefined) out.else = validateSteps(raw.else);
      return out;
    }
    case 'while': {
      if (!isFiniteNumber(raw.maxIterations)) return fail('while.maxIterations must be numeric');
      return {
        kind: 'while',
        condition: validatePredicate(raw.condition),
        body: validateSteps(raw.body),
        maxIterations: raw.maxIterations,
      };
    }
    case 'repeat': {
      if (!isFiniteNumber(raw.times)) return fail('repeat.times must be numeric');
      return { kind: 'repeat', times: raw.times, body: validateSteps(raw.body) };
    }
    default:
      return fail(`unknown step kind: ${String(kind)}`);
  }
};

const PRESS_COUNT_MIN = 1;
const PRESS_COUNT_MAX = 8;

const validateBehavior = (raw: unknown): Behavior => {
  if (!isObject(raw)) return fail('behavior is not an object');
  if (!isFiniteNumber(raw.pressCount)) return fail('behavior.pressCount must be numeric');
  if (raw.pressCount < PRESS_COUNT_MIN || raw.pressCount > PRESS_COUNT_MAX) {
    return fail(
      `behavior.pressCount must be between ${PRESS_COUNT_MIN} and ${PRESS_COUNT_MAX} (S3 has 8 reset slots)`,
    );
  }
  if (!isString(raw.label)) return fail('behavior.label must be a string');
  const behavior: Behavior = {
    pressCount: raw.pressCount,
    label: raw.label,
    steps: validateSteps(raw.steps),
  };
  // Optional auxiliary display data: the Blockly workspace JSON the steps were
  // compiled from. Arbitrary Blockly structure, so accept any plain object and
  // let the editor's load-time try/catch reject anything Blockly can't parse.
  // Non-object values are dropped rather than failing the whole program.
  if (isObject(raw.workspaceJson)) behavior.workspaceJson = raw.workspaceJson;
  return behavior;
};

export function validateProgram(raw: unknown): Program {
  if (!isObject(raw)) return fail('top-level value is not an object');
  if (raw.version !== 1) return fail(`unsupported version: ${String(raw.version)}`);
  if (!Array.isArray(raw.behaviors)) return fail('behaviors must be an array');
  return {
    version: 1,
    behaviors: raw.behaviors.map(validateBehavior),
  };
}

export function loadProgram(): Program | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateProgram(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveProgram(program: Program): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(program));
}

export function clearProgram(): void {
  localStorage.removeItem(STORAGE_KEY);
}
