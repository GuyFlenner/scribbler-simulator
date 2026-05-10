import { useEffect, useRef, type ReactElement } from 'react';
import * as Blockly from 'blockly';
import { useEditorStore } from '../store/editor-store';
import { blockDefinitions, toolboxXml } from './toolbox';
import { compileBlocklyJson } from './codegen';

let blocksRegistered = false;
const registerBlocks = (): void => {
  if (blocksRegistered) return;
  for (const def of blockDefinitions) {
    Blockly.Blocks[def.type] = {
      init(this: Blockly.Block) {
        this.jsonInit(def as unknown as Record<string, unknown>);
      },
    };
  }
  blocksRegistered = true;
};

interface BlocklyEditorProps {
  pressCount: number;
}

export function BlocklyEditor({ pressCount }: BlocklyEditorProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const setBehavior = useEditorStore((s) => s.setBehavior);
  const initialJson = useEditorStore((s) => s.workspaceJsonByPressCount[pressCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    registerBlocks();

    const ws = Blockly.inject(container, {
      toolbox: toolboxXml,
      trashcan: true,
      grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0 },
    });
    workspaceRef.current = ws;

    if (initialJson && typeof initialJson === 'object') {
      try {
        Blockly.serialization.workspaces.load(initialJson as object, ws);
      } catch {
        ws.clear();
      }
    }

    const handleChange = (): void => {
      const json = Blockly.serialization.workspaces.save(ws);
      const steps = compileBlocklyJson(json);
      setBehavior(pressCount, steps, json);
    };

    ws.addChangeListener(handleChange);

    return () => {
      ws.dispose();
      workspaceRef.current = null;
    };
  }, [pressCount, initialJson, setBehavior]);

  return <div ref={containerRef} style={{ width: '100%', height: 480, border: '1px solid #ccc' }} />;
}
