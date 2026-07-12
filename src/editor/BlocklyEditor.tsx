import { useEffect, useRef, type ReactElement } from 'react';
import * as Blockly from 'blockly';
import * as BlocklyHeMsg from 'blockly/msg/he';
import * as BlocklyEnMsg from 'blockly/msg/en';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../store/editor-store';
import { useGradeStore } from '../store/grade-store';
import { buildBlockDefinitions, buildToolboxXml } from './toolbox';
import { compileBlocklyJson, stepsToWorkspaceJson } from './codegen';

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

const BLOCK_MUTATION_TYPES: ReadonlySet<string> = new Set([
  Blockly.Events.BLOCK_CREATE,
  Blockly.Events.BLOCK_DELETE,
  Blockly.Events.BLOCK_CHANGE,
  Blockly.Events.BLOCK_MOVE,
]);

export function BlocklyEditor({ pressCount }: BlocklyEditorProps): ReactElement {
  const { t, i18n } = useTranslation();
  const grade = useGradeStore((s) => s.grade);
  const isHebrew = i18n.language.startsWith('he');
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    Blockly.setLocale(
      (isHebrew ? BlocklyHeMsg : BlocklyEnMsg) as unknown as Record<string, string>,
    );
    registerBlocks(t);

    const ws = Blockly.inject(container, {
      toolbox: buildToolboxXml(t, grade),
      rtl: isHebrew,
      trashcan: true,
      grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0 },
    });
    workspaceRef.current = ws;

    // Read initialJson once at mount (NOT via useEditorStore subscription) — otherwise
    // the change handler below writes back into the store, the subscription fires, and
    // the effect re-runs, disposing the freshly-injected workspace. This was the cause
    // of the editor-mode freeze reported in the browser.
    //
    // Fallback: if no Blockly JSON has been stored for this press-count yet (e.g.
    // because the program was loaded via the "Load sample" preset which only sets
    // Step[]), regenerate it from the steps. Otherwise the workspace renders blank
    // even though programs[N] has logic.
    const editorState = useEditorStore.getState();
    const storedJson = editorState.workspaceJsonByPressCount[pressCount];
    const stepsForPress = editorState.programs[pressCount];
    const initialJson =
      storedJson ??
      (stepsForPress && stepsForPress.length > 0 ? stepsToWorkspaceJson(stepsForPress) : undefined);
    if (initialJson && typeof initialJson === 'object') {
      try {
        Blockly.serialization.workspaces.load(initialJson as object, ws);
      } catch {
        ws.clear();
      }
    }

    const handleChange = (event: Blockly.Events.Abstract): void => {
      // Ignore UI events (clicks, viewport changes, theme apply) and lifecycle events
      // (FINISHED_LOADING). Only persist when blocks are actually created/deleted/moved/
      // changed. Without this filter, Blockly emits ~5 events during inject() alone,
      // each of which would trigger a store write.
      if (event.isUiEvent) return;
      if (!BLOCK_MUTATION_TYPES.has(event.type)) return;

      const json = Blockly.serialization.workspaces.save(ws);
      const steps = compileBlocklyJson(json);
      useEditorStore.getState().setBehavior(pressCount, steps, json);
    };

    ws.addChangeListener(handleChange);

    return () => {
      ws.dispose();
      workspaceRef.current = null;
    };
  }, [pressCount, isHebrew, t, grade]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 480, border: '1px solid #ccc' }} />
  );
}
