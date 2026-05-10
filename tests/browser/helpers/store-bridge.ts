import i18n from '../../../src/i18n';
import { useSimStore } from '../../../src/store/sim-store';
import { useEditorStore } from '../../../src/store/editor-store';
import { useBoardsStore } from '../../../src/store/boards-store';

interface ScribblerBridge {
  simStore: typeof useSimStore;
  editorStore: typeof useEditorStore;
  boardsStore: typeof useBoardsStore;
  i18n: typeof i18n;
}

const ensureBridge = (): ScribblerBridge => {
  const w = window as Window & { __scribbler?: ScribblerBridge };
  if (!w.__scribbler) {
    w.__scribbler = { simStore: useSimStore, editorStore: useEditorStore, boardsStore: useBoardsStore, i18n };
  }
  return w.__scribbler;
};

export const storeBridge = {
  simStore: () => ensureBridge().simStore.getState(),
  editorStore: () => ensureBridge().editorStore.getState(),
  boardsStore: () => ensureBridge().boardsStore.getState(),
  i18n: () => ensureBridge().i18n,
  async resetAll(): Promise<void> {
    const b = ensureBridge();
    b.simStore.getState().resetBoard();
    b.editorStore.getState().resetAll();
    b.boardsStore.getState().resetAll();
    await b.i18n.changeLanguage('en');
    localStorage.clear();
  },
};
