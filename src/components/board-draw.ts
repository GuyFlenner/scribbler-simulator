import type { BoardState } from '../sim/boards/schema';
import { ROBOT_LENGTH_M, ROBOT_WIDTH_M, type RobotState } from '../sim/types';

export interface DrawOptions {
  showGrid?: boolean;
  showLines?: boolean;
  showLights?: boolean;
  showRobot?: boolean;
  markerRadiusPx?: number;
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

  const emojiFont = (sizePx: number): string =>
    `${sizePx}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui`;

  for (const el of board.elements) {
    if (el.kind === 'obstacle') {
      const ox = el.x * scaleX;
      const oy = el.y * scaleY;
      const ow = el.w * scaleX;
      const oh = el.h * scaleY;
      ctx.fillStyle = '#a87856';
      ctx.fillRect(ox, oy, ow, oh);
      ctx.strokeStyle = '#5a3417';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox, oy, ow, oh);
      const emojiSize = Math.min(ow, oh) * 0.65;
      if (emojiSize >= 8) {
        ctx.font = emojiFont(emojiSize);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪨', ox + ow / 2, oy + oh / 2);
      }
    } else if (el.kind === 'line' && showLines) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = Math.max(1, el.thickness * scaleY);
      ctx.beginPath();
      ctx.moveTo(el.x1 * scaleX, el.y1 * scaleY);
      ctx.lineTo(el.x2 * scaleX, el.y2 * scaleY);
      ctx.stroke();
    } else if (el.kind === 'light' && showLights) {
      const lx = el.x * scaleX;
      const ly = el.y * scaleY;
      const r = Math.max(4, markerRadiusPx * 0.6);
      const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 2);
      grad.addColorStop(0, '#fff7c2');
      grad.addColorStop(1, 'rgba(255, 224, 102, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lx, ly, r * 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, 2 * Math.PI);
      ctx.fill();
    } else if (el.kind === 'start') {
      const sx = el.x * scaleX;
      const sy = el.y * scaleY;
      const flagSize = markerRadiusPx * 2.2;
      ctx.font = emojiFont(flagSize);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚩', sx, sy);
    } else if (el.kind === 'goal') {
      const gx = el.x * scaleX;
      const gy = el.y * scaleY;
      const flagSize = markerRadiusPx * 2.4;
      ctx.font = emojiFont(flagSize);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏁', gx, gy);
    } else if (el.kind === 'bonus') {
      const bx = el.x * scaleX;
      const by = el.y * scaleY;
      // Halo to make the bonus zone read as a target zone, not just a sticker.
      const haloR = (el.toleranceCm / 100) * Math.min(scaleX, scaleY);
      if (haloR > 4) {
        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, haloR);
        grad.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, haloR, 0, 2 * Math.PI);
        ctx.fill();
      }
      const starSize = markerRadiusPx * 2.2;
      ctx.font = emojiFont(starSize);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', bx, by);
    }
  }

  if (showRobot && robot) {
    const cx = robot.x * scaleX;
    const cy = robot.y * scaleY;
    const L = ROBOT_LENGTH_M * scaleX;
    const W = ROBOT_WIDTH_M * scaleY;
    const noseInset = L * 0.35;
    const bodyColor = robot.isStalled ? '#cc0000' : '#2c5cff';

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(robot.heading);

    // Side wheels — drawn before the body so the body edge covers their inside
    const wheelLen = L * 0.58;
    const wheelThick = Math.max(2, W * 0.22);
    ctx.fillStyle = '#333';
    ctx.fillRect(-wheelLen / 2, -W / 2 - wheelThick, wheelLen, wheelThick);
    ctx.fillRect(-wheelLen / 2, W / 2, wheelLen, wheelThick);

    // Body — pentagon pointing forward (+x in robot-local frame)
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-L / 2, -W / 2);
    ctx.lineTo(-L / 2, W / 2);
    ctx.lineTo(L / 2 - noseInset, W / 2);
    ctx.lineTo(L / 2, 0);
    ctx.lineTo(L / 2 - noseInset, -W / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = robot.isStalled ? '#8b0000' : '#1a3380';
    ctx.lineWidth = Math.max(1, L / 30);
    ctx.stroke();

    // Yellow nose wedge — fills the entire triangular front section so the
    // direction is obvious at a glance after any rotation.
    if (L > 12) {
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.moveTo(L / 2 - noseInset, -W / 2);
      ctx.lineTo(L / 2, 0);
      ctx.lineTo(L / 2 - noseInset, W / 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
