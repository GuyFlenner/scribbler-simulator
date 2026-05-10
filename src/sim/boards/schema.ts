export type Obstacle = { kind: 'obstacle'; x: number; y: number; w: number; h: number };
export type LineSegment = {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
};
export type LightSource = { kind: 'light'; x: number; y: number; intensity: number };
export type StartMarker = { kind: 'start'; x: number; y: number; heading: number };
export type GoalMarker = { kind: 'goal'; x: number; y: number; toleranceCm: number };

export type BoardElement = Obstacle | LineSegment | LightSource | StartMarker | GoalMarker;

export interface BoardState {
  version: 1;
  id: string;
  name: string;
  width: number;
  height: number;
  elements: BoardElement[];
}

const SUPPORTED_VERSION = 1 as const;

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

const fail = (msg: string): never => {
  throw new Error(`parseBoard: ${msg}`);
};

const parseElement = (raw: unknown, idx: number): BoardElement => {
  if (typeof raw !== 'object' || raw === null) {
    return fail(`element ${idx} is not an object`);
  }
  const obj = raw as Record<string, unknown>;
  const kind = obj.kind;

  switch (kind) {
    case 'obstacle': {
      if (
        !isFiniteNumber(obj.x) ||
        !isFiniteNumber(obj.y) ||
        !isFiniteNumber(obj.w) ||
        !isFiniteNumber(obj.h)
      ) {
        return fail(`element ${idx} (obstacle) has non-numeric coordinates`);
      }
      return { kind: 'obstacle', x: obj.x, y: obj.y, w: obj.w, h: obj.h };
    }
    case 'line': {
      if (
        !isFiniteNumber(obj.x1) ||
        !isFiniteNumber(obj.y1) ||
        !isFiniteNumber(obj.x2) ||
        !isFiniteNumber(obj.y2) ||
        !isFiniteNumber(obj.thickness)
      ) {
        return fail(`element ${idx} (line) has non-numeric coordinates`);
      }
      return {
        kind: 'line',
        x1: obj.x1,
        y1: obj.y1,
        x2: obj.x2,
        y2: obj.y2,
        thickness: obj.thickness,
      };
    }
    case 'light': {
      if (!isFiniteNumber(obj.x) || !isFiniteNumber(obj.y) || !isFiniteNumber(obj.intensity)) {
        return fail(`element ${idx} (light) has non-numeric values`);
      }
      return { kind: 'light', x: obj.x, y: obj.y, intensity: obj.intensity };
    }
    case 'start': {
      if (!isFiniteNumber(obj.x) || !isFiniteNumber(obj.y) || !isFiniteNumber(obj.heading)) {
        return fail(`element ${idx} (start) has non-numeric values`);
      }
      return { kind: 'start', x: obj.x, y: obj.y, heading: obj.heading };
    }
    case 'goal': {
      if (!isFiniteNumber(obj.x) || !isFiniteNumber(obj.y) || !isFiniteNumber(obj.toleranceCm)) {
        return fail(`element ${idx} (goal) has non-numeric values`);
      }
      return { kind: 'goal', x: obj.x, y: obj.y, toleranceCm: obj.toleranceCm };
    }
    default:
      return fail(`element ${idx} has unknown kind: ${String(kind)}`);
  }
};

export function parseBoard(input: string | unknown): BoardState {
  let parsed: unknown;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      return fail(`invalid JSON: ${(err as Error).message}`);
    }
  } else {
    parsed = input;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return fail('top-level value is not an object');
  }
  const obj = parsed as Record<string, unknown>;

  if (obj.version !== SUPPORTED_VERSION) {
    return fail(`unsupported version: ${String(obj.version)} (expected ${SUPPORTED_VERSION})`);
  }
  if (!isNonEmptyString(obj.id)) return fail('id is missing or empty');
  if (!isNonEmptyString(obj.name)) return fail('name is missing or empty');
  if (!isFiniteNumber(obj.width) || obj.width <= 0) return fail('width must be a positive number');
  if (!isFiniteNumber(obj.height) || obj.height <= 0) {
    return fail('height must be a positive number');
  }
  if (!Array.isArray(obj.elements)) return fail('elements must be an array');

  const elements = obj.elements.map((el, i) => parseElement(el, i));

  return {
    version: SUPPORTED_VERSION,
    id: obj.id,
    name: obj.name,
    width: obj.width,
    height: obj.height,
    elements,
  };
}
