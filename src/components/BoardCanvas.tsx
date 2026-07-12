import { useEffect, useRef, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/sim-store';
import { drawBoard } from './board-draw';

const CANVAS_PX = 500;

export function BoardCanvas(): ReactElement {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tick = useSimStore((s) => s.tick);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let prev = performance.now();

    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      tick(dt);
      const state = useSimStore.getState();
      drawBoard(ctx, state.board, CANVAS_PX, CANVAS_PX, state.robot, {
        stopZoneStates: state.stopZoneProgress?.map((p) => p.everSatisfied),
      });
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_PX}
      height={CANVAS_PX}
      role="img"
      aria-label={t('simulator.board_aria')}
      style={{ border: '2px solid #333', borderRadius: 4, background: '#f4f1e8' }}
    />
  );
}
