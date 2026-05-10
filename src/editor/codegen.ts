import type { Step } from '../sim/behaviors/schema';

export interface BlocklyBlock {
  type: string;
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

const compileSingle = (block: BlocklyBlock): Step | null => {
  switch (block.type) {
    case 'drive_distance':
      return { kind: 'drive', cm: numField(block, 'CM', 0) };
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
      const body = compileBlocks(childBlock(block, 'DO') ? [childBlock(block, 'DO') as BlocklyBlock] : []);
      return { kind: 'repeat', times, body };
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
