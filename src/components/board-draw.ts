import type { BoardState } from '../sim/boards/schema';
import { ROBOT_LENGTH_M, ROBOT_WIDTH_M, type RobotState } from '../sim/types';

export interface DrawOptions {
  showGrid?: boolean;
  showLines?: boolean;
  showLights?: boolean;
  showRobot?: boolean;
  markerRadiusPx?: number;
  markerFontPx?: number;
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: BoardState,
  width: number,
  height: number,
  robot?: RobotState,
  opts: DrawOptions = {},
): void {
  const {
    showGrid = true,
    showLines = true,
    showLights = true,
    showRobot = true,
    markerRadiusPx = Math.max(6, Math.min(width, height) / 28),
    markerFontPx = Math.max(8, Math.min(width, height) / 32),
  } = opts;

  const scaleX = width / board.width;
  const scaleY = height / board.height;

  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(0, 0, width, height);

  if (showGrid) {
    ctx.strokeStyle = '#bfb59f';
    ctx.lineWidth = 1;
    const cells = 10;
    for (let i = 1; i < cells; i++) {
      const px = (i * width) / cells;
      const py = (i * height) / cells;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
    }
  }

  for (const el of board.elements) {
    if (el.kind === 'obstacle') {
      ctx.fillStyle = '#7a4a2b';
      ctx.fillRect(el.x * scaleX, el.y * scaleY, el.w * scaleX, el.h * scaleY);
    } else if (el.kind === 'line' && showLines) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = Math.max(1, el.thickness * scaleY);
      ctx.beginPath();
      ctx.moveTo(el.x1 * scaleX, el.y1 * scaleY);
      ctx.lineTo(el.x2 * scaleX, el.y2 * scaleY);
      ctx.stroke();
    } else if (el.kind === 'light' && showLights) {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(el.x * scaleX, el.y * scaleY, Math.max(2, markerRadiusPx * 0.5), 0, 2 * Math.PI);
      ctx.fill();
    } else if (el.kind === 'start') {
      ctx.fillStyle = '#3a8b3a';
      ctx.beginPath();
      ctx.arc(el.x * scaleX, el.y * scaleY, markerRadiusPx, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${markerFontPx}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', el.x * scaleX, el.y * scaleY);
    } else if (el.kind === 'goal') {
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(el.x * scaleX, el.y * scaleY, markerRadiusPx + 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${markerFontPx}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('B', el.x * scaleX, el.y * scaleY);
    }
  }

  if (showRobot && robot) {
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
    const stripe = Math.max(2, lengthPx / 6);
    ctx.fillRect(lengthPx / 2 - stripe, -widthPx / 2, stripe, widthPx);
    ctx.restore();
  }
}
