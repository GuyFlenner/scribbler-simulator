import { useEffect, useRef, type ReactElement } from 'react';
import * as Blockly from 'blockly';
import * as BlocklyHeMsg from 'blockly/msg/he';
import * as BlocklyEnMsg from 'blockly/msg/en';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../store/editor-store';
import { buildBlockDefinitions, buildToolboxXml } from './toolbox';
import { compileBlocklyJson } from './codegen';

const registerBlocks = (t: TFunction): void => {
  for (const def of buildBlockDefinitions(t)) {
    Blockly.Blocks[def.type] = {
      init(this: Blockly.Block) {
        this.jsonInit(def as unknown as Record<string, unknown>);
      },
    };
  }
};

interface BlocklyEditorProps {
  pressCount: number;
}

export function BlocklyEditor({ pressCount }: BlocklyEditorProps): ReactElement {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language.startsWith('he');
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const setBehavior = useEditorStore((s) => s.setBehavior);
  const initialJson = useEditorStore((s) => s.workspaceJsonByPressCount[pressCount]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    Blockly.setLocale((isHebrew ? BlocklyHeMsg : BlocklyEnMsg) as unknown as Record<string, string>);
    registerBlocks(t);

    const ws = Blockly.inject(container, {
      toolbox: buildToolboxXml(t),
      rtl: isHebrew,
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
  }, [pressCount, initialJson, setBehavior, isHebrew, t]);

  return <div ref={containerRef} style={{ width: '100%', height: 480, border: '1px solid #ccc' }} />;
}
