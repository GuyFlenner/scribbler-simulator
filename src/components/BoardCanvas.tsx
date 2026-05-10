import { useEffect, useRef, type ReactElement } from 'react';
import { useSimStore } from '../store/sim-store';
import { ROBOT_LENGTH_M, ROBOT_WIDTH_M } from '../sim/types';

const CANVAS_PX = 500;

const draw = (ctx: CanvasRenderingContext2D, state: ReturnType<typeof useSimStore.getState>): void => {
  const { board, robot } = state;
  const scaleX = CANVAS_PX / board.width;
  const scaleY = CANVAS_PX / board.height;

  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);

  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const px = i * (CANVAS_PX / 10);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, CANVAS_PX);
    ctx.moveTo(0, px);
    ctx.lineTo(CANVAS_PX, px);
    ctx.stroke();
  }

  for (const el of board.elements) {
    if (el.kind === 'obstacle') {
      ctx.fillStyle = '#7a4a2b';
      ctx.fillRect(el.x * scaleX, el.y * scaleY, el.w * scaleX, el.h * scaleY);
    } else if (el.kind === 'start') {
      ctx.fillStyle = '#3a8b3a';
      ctx.beginPath();
      ctx.arc(el.x * scaleX, el.y * scaleY, 12, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', el.x * scaleX, el.y * scaleY);
    } else if (el.kind === 'goal') {
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(el.x * scaleX, el.y * scaleY, 14, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('B', el.x * scaleX, el.y * scaleY);
    }
  }

  const cx = robot.x * scaleX;
  const cy = robot.y * scaleY;
  const lengthPx = ROBOT_LENGTH_M * scaleX;
  const widthPx = ROBOT_WIDTH_M * scaleY;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(robot.heading);
  ctx.fillStyle = robot.isStalled ? '#cc0000' : '#2c5cff';
  ctx.fillRect(-lengthPx / 2, -widthPx / 2, lengthPx, widthPx);
  ctx.fillStyle = '#fff';
  ctx.fillRect(lengthPx / 2 - 8, -widthPx / 2, 8, widthPx);
  ctx.restore();
};

export function BoardCanvas(): ReactElement {
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
      draw(ctx, useSimStore.getState());
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
      aria-label="Simulator board"
      style={{ border: '2px solid #333', borderRadius: 4, background: '#f4f1e8' }}
    />
  );
}
