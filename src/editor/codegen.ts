import type { SensorPredicate, Step } from '../sim/behaviors/schema';

export interface BlocklyBlock {
  type: string;
  x?: number;
  y?: number;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: BlocklyBlock; shadow?: BlocklyBlock }>;
  next?: { block?: BlocklyBlock; shadow?: BlocklyBlock };
}

export interface BlocklyWorkspaceJson {
  blocks?: {
    languageVersion?: number;
    blocks?: BlocklyBlock[];
  };
}

const numField = (block: BlocklyBlock, name: string, fallback: number): number => {
  const raw = block.fields?.[name];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
};

const childBlock = (block: BlocklyBlock, inputName: string): BlocklyBlock | undefined =>
  block.inputs?.[inputName]?.block ?? block.inputs?.[inputName]?.shadow;

const SENSOR_KINDS = new Set(['line_left', 'line_right', 'obstacle_left', 'obstacle_right']);

const sensorFromField = (block: BlocklyBlock): SensorPredicate | null => {
  const raw = block.fields?.SENSOR;
  if (typeof raw !== 'string') return null;
  if (
    raw === 'line_left' ||
    raw === 'line_right' ||
    raw === 'obstacle_left' ||
    raw === 'obstacle_right'
  ) {
    return { kind: raw };
  }
  if (SENSOR_KINDS.has(raw)) return { kind: raw as SensorPredicate['kind'] } as SensorPredicate;
  return null;
};

const compileBody = (block: BlocklyBlock, inputName: string): Step[] => {
  const inner = childBlock(block, inputName);
  return inner ? compileBlocks([inner]) : [];
};

const compileSingle = (block: BlocklyBlock): Step | null => {
  switch (block.type) {
    case 'drive_distance':
      return { kind: 'drive', cm: numField(block, 'CM', 0) };
    case 'drive_wheels':
      return {
        kind: 'drive_wheels',
        leftSpeedPct: numField(block, 'LEFT', 0),
        rightSpeedPct: numField(block, 'RIGHT', 0),
        durationMs: numField(block, 'DURATION_MS', 1000),
      };
    case 'drive_arc':
      return {
        kind: 'drive_arc',
        radiusCm: numField(block, 'RADIUS_CM', 20),
        degrees: numField(block, 'DEGREES', 0),
      };
    case 'rotate_degrees':
      return { kind: 'rotate', degrees: numField(block, 'DEGREES', 0) };
    case 'stop':
      return { kind: 'stop' };
    case 'beep':
      return { kind: 'beep', durationMs: numField(block, 'DURATION_MS', 200) };
    case 'wait':
      return { kind: 'wait', seconds: numField(block, 'SECONDS', 1) };
    case 'repeat': {
      const times = numField(block, 'TIMES', 1);
      const body = compileBody(block, 'DO');
      return { kind: 'repeat', times, body };
    }
    case 'if_sensor': {
      const sensor = sensorFromField(block);
      if (!sensor) return null;
      const thenBody = compileBody(block, 'DO');
      const elseBody = childBlock(block, 'ELSE') ? compileBody(block, 'ELSE') : undefined;
      const out: Step = { kind: 'if', condition: sensor, then: thenBody };
      if (elseBody) out.else = elseBody;
      return out;
    }
    case 'while_sensor': {
      const sensor = sensorFromField(block);
      if (!sensor) return null;
      return {
        kind: 'while',
        condition: sensor,
        body: compileBody(block, 'DO'),
        maxIterations: 10000,
      };
    }
    case 'while_not_sensor': {
      const sensor = sensorFromField(block);
      if (!sensor) return null;
      return {
        kind: 'while',
        condition: { kind: 'not', inner: sensor },
        body: compileBody(block, 'DO'),
        maxIterations: 10000,
      };
    }
    default:
      return null;
  }
};

export function compileBlocks(roots: BlocklyBlock[]): Step[] {
  const out: Step[] = [];
  for (const root of roots) {
    let cur: BlocklyBlock | undefined = root;
    while (cur) {
      const step = compileSingle(cur);
      if (step) out.push(step);
      cur = cur.next?.block ?? cur.next?.shadow;
    }
  }
  return out;
}

export function compileBlocklyJson(input: unknown): Step[] {
  if (!input || typeof input !== 'object') return [];
  const ws = input as BlocklyWorkspaceJson;
  const roots = ws.blocks?.blocks;
  if (!Array.isArray(roots)) return [];
  return compileBlocks(roots);
}

// ============================================================================
// Reverse codegen: Step[] → BlocklyWorkspaceJson
//
// Used when an editor program has a Step[] (e.g. from Load Sample, or from
// pre-bonus-era localStorage saved before workspaceJson was tracked) but no
// stored Blockly workspace JSON. Without this, the editor renders a blank
// workspace even though programs[N] has steps.
//
// Lossy on if/while/while_not — they require a sensor predicate that maps
// back to the dropdown SENSOR field, which only exists for leaf predicates.
// `not(line_left)` round-trips via the dedicated `while_not_sensor` block.
// `and`/`or`/`light_above` cannot be represented; those steps are silently
// dropped from the workspace (the run-time Step[] is unaffected).
// ============================================================================

const sensorFieldFromPredicate = (
  pred: SensorPredicate,
): { value: string; negated: boolean } | null => {
  if (
    pred.kind === 'line_left' ||
    pred.kind === 'line_right' ||
    pred.kind === 'obstacle_left' ||
    pred.kind === 'obstacle_right'
  ) {
    return { value: pred.kind, negated: false };
  }
  if (pred.kind === 'not') {
    const inner = sensorFieldFromPredicate(pred.inner);
    if (inner && !inner.negated) return { value: inner.value, negated: true };
  }
  return null;
};

const stepToBlock = (step: Step): BlocklyBlock | null => {
  switch (step.kind) {
    case 'drive':
      return { type: 'drive_distance', fields: { CM: step.cm } };
    case 'drive_wheels':
      return {
        type: 'drive_wheels',
        fields: {
          LEFT: step.leftSpeedPct,
          RIGHT: step.rightSpeedPct,
          DURATION_MS: step.durationMs,
        },
      };
    case 'drive_arc':
      return {
        type: 'drive_arc',
        fields: { RADIUS_CM: step.radiusCm, DEGREES: step.degrees },
      };
    case 'rotate':
      return { type: 'rotate_degrees', fields: { DEGREES: step.degrees } };
    case 'stop':
      return { type: 'stop' };
    case 'beep':
      return { type: 'beep', fields: { DURATION_MS: step.durationMs } };
    case 'wait':
      return { type: 'wait', fields: { SECONDS: step.seconds } };
    case 'repeat': {
      const inner = stepsToBlockChain(step.body);
      const block: BlocklyBlock = { type: 'repeat', fields: { TIMES: step.times } };
      if (inner) block.inputs = { DO: { block: inner } };
      return block;
    }
    case 'if': {
      const sensor = sensorFieldFromPredicate(step.condition);
      if (!sensor || sensor.negated) return null; // if_sensor doesn't expose negate
      const block: BlocklyBlock = {
        type: 'if_sensor',
        fields: { SENSOR: sensor.value },
      };
      const thenInner = stepsToBlockChain(step.then);
      const elseInner = step.else ? stepsToBlockChain(step.else) : null;
      block.inputs = {};
      if (thenInner) block.inputs.DO = { block: thenInner };
      if (elseInner) block.inputs.ELSE = { block: elseInner };
      return block;
    }
    case 'while': {
      const sensor = sensorFieldFromPredicate(step.condition);
      if (!sensor) return null;
      const type = sensor.negated ? 'while_not_sensor' : 'while_sensor';
      const block: BlocklyBlock = { type, fields: { SENSOR: sensor.value } };
      const inner = stepsToBlockChain(step.body);
      if (inner) block.inputs = { DO: { block: inner } };
      return block;
    }
  }
};

const stepsToBlockChain = (steps: Step[]): BlocklyBlock | null => {
  let head: BlocklyBlock | null = null;
  let tail: BlocklyBlock | null = null;
  for (const step of steps) {
    const block = stepToBlock(step);
    if (!block) continue;
    if (!head) {
      head = block;
      tail = block;
    } else if (tail) {
      tail.next = { block };
      tail = block;
    }
  }
  return head;
};

export function stepsToWorkspaceJson(steps: Step[]): BlocklyWorkspaceJson {
  const root = stepsToBlockChain(steps);
  const rootWithCoords = root ? [{ ...root, x: 50, y: 50 }] : [];
  return { blocks: { languageVersion: 0, blocks: rootWithCoords } };
}
