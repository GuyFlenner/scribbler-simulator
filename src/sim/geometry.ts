import type { BoardState, CornerCut } from './boards/schema';

/**
 * Shared 2D geometry helpers for physics (collision) and sensors (distance
 * queries). Pure math — no board or robot state.
 */

export const distPointToSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
};

export const closestPointOnSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number } => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return { x: x1, y: y1 };
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * dx, y: y1 + t * dy };
};

export const distPointToRect = (
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): number => {
  const cx = Math.max(rx, Math.min(px, rx + rw));
  const cy = Math.max(ry, Math.min(py, ry + rh));
  return Math.hypot(px - cx, py - cy);
};

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
}

/** Visual/collision thickness of a corner-cut hypotenuse (the dashed edge). */
export const CORNER_EDGE_THICKNESS_M = 0.01;

/**
 * The hypotenuse of a corner-cut triangle. The triangle's two legs lie along
 * the board edges, so the hypotenuse is the only reachable boundary — blocking
 * it blocks the whole forbidden zone.
 */
export const cornerHypotenuse = (
  corner: CornerCut['corner'],
  size: number,
  boardWidth: number,
  boardHeight: number,
): Segment => {
  switch (corner) {
    case 'nw':
      return { x1: 0, y1: size, x2: size, y2: 0, thickness: CORNER_EDGE_THICKNESS_M };
    case 'ne':
      return {
        x1: boardWidth - size,
        y1: 0,
        x2: boardWidth,
        y2: size,
        thickness: CORNER_EDGE_THICKNESS_M,
      };
    case 'sw':
      return {
        x1: 0,
        y1: boardHeight - size,
        x2: size,
        y2: boardHeight,
        thickness: CORNER_EDGE_THICKNESS_M,
      };
    case 'se':
      return {
        x1: boardWidth - size,
        y1: boardHeight,
        x2: boardWidth,
        y2: boardHeight - size,
        thickness: CORNER_EDGE_THICKNESS_M,
      };
  }
};

// Memoized per board object: detectCollision runs every physics tick and the
// IR sensors on every predicate read — rebuilding a (usually empty) array from
// 160+ elements on track boards each time is avoidable. Board objects are
// treated as immutable throughout the app (stores replace, never mutate).
const wallSegmentsCache = new WeakMap<BoardState, Segment[]>();

/**
 * All impassable boundary segments of a board: diagonal walls plus the derived
 * corner-cut hypotenuses. Boards without wall/corner elements (all grade-4
 * boards) return an empty array, keeping the original collision path intact.
 */
export const boardWallSegments = (board: BoardState): Segment[] => {
  const cached = wallSegmentsCache.get(board);
  if (cached) return cached;
  const segments: Segment[] = [];
  for (const el of board.elements) {
    if (el.kind === 'wall') {
      segments.push({ x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2, thickness: el.thickness });
    } else if (el.kind === 'corner') {
      segments.push(cornerHypotenuse(el.corner, el.size, board.width, board.height));
    }
  }
  wallSegmentsCache.set(board, segments);
  return segments;
};
