/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import i18n from './i18n';
import { useSimStore } from './store/sim-store';
import { useEditorStore } from './store/editor-store';
import { useBoardsStore } from './store/boards-store';
import './index.css';

declare global {
  interface Window {
    __scribbler?: {
      simStore: typeof useSimStore;
      editorStore: typeof useEditorStore;
      boardsStore: typeof useBoardsStore;
      i18n: typeof i18n;
    };
  }
}

if (import.meta.env.MODE === 'test' || import.meta.env.VITE_E2E === '1') {
  window.__scribbler = {
    simStore: useSimStore,
    editorStore: useEditorStore,
    boardsStore: useBoardsStore,
    i18n,
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
