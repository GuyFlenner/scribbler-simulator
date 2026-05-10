import { useEffect, useRef, type ReactElement } from 'react';
import type { BoardState } from '../sim/boards/schema';
import { drawBoard } from './board-draw';

interface Props {
  board: BoardState;
  size?: number;
  ariaLabel?: string;
}

export function BoardThumbnail({ board, size = 56, ariaLabel }: Props): ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawBoard(ctx, board, size, size, undefined, {
      showGrid: false,
      markerRadiusPx: Math.max(4, size / 8),
      markerFontPx: Math.max(6, size / 9),
    });
  }, [board, size]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      role="img"
      aria-label={ariaLabel}
      style={{
        width: size,
        height: size,
        border: '1px solid #aaa',
        borderRadius: 4,
        flexShrink: 0,
      }}
    />
  );
}
