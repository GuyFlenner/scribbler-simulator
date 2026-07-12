import type { BoardState, LineSegment } from './schema';

/**
 * Grade 7-9 line-track boards, modeled on the official Robotraffic courses:
 * a "Careful Driving" figure-8 loop and a "Racing" serpentine with hairpin
 * turnarounds. Tracks are chains of the existing `line` elements — the line
 * sensors are geometric (point-to-segment), so a densely sampled curve
 * behaves exactly like a continuous one.
 */

/** Official Robotraffic line width: 50 mm. */
export const TRACK_THICKNESS_M = 0.05;

/**
 * Sample a parametric curve t∈[0,1] into a chain of line segments.
 * Consecutive segments share endpoints exactly (no gaps).
 */
export function sampleCurve(
  point: (t: number) => { x: number; y: number },
  segments: number,
  thickness: number = TRACK_THICKNESS_M,
): LineSegment[] {
  const out: LineSegment[] = [];
  let prev = point(0);
  for (let i = 1; i <= segments; i++) {
    const next = point(i / segments);
    out.push({
      kind: 'line',
      x1: prev.x,
      y1: prev.y,
      x2: next.x,
      y2: next.y,
      thickness,
    });
    prev = next;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Figure-8 ("Careful Driving") — lemniscate of Gerono centred on the board.
// Minimum radius of curvature ≈ FIG8_A (at the lobe ends) — comfortably above
// the bang-bang follower's tightest steerable radius.
// ---------------------------------------------------------------------------

const FIG8_A = 0.35;

export const figureEightPoint = (t: number): { x: number; y: number } => {
  const theta = 2 * Math.PI * t;
  return {
    x: 0.5 + FIG8_A * Math.cos(theta),
    y: 0.5 + (FIG8_A / 2) * Math.sin(2 * theta),
  };
};

/** Goal placement: ~85% around the circuit so it isn't hit at the start. */
const FIG8_GOAL_T = 0.85;

export const figureEightBoard: BoardState = {
  version: 1,
  id: 'track-figure8',
  name: 'Careful driving 🛣️ (1.0m × 1.0m)',
  width: 1.0,
  height: 1.0,
  elements: [
    // Start ON the line at t=0 with heading = curve tangent (straight down).
    { kind: 'start', x: 0.5 + FIG8_A, y: 0.5, heading: Math.PI / 2 },
    { kind: 'goal', ...figureEightPoint(FIG8_GOAL_T), toleranceCm: 5 },
    ...sampleCurve(figureEightPoint, 160),
  ],
};

// ---------------------------------------------------------------------------
// Serpentine ("Racing") — three straights joined by two half-circle hairpins
// of radius 0.15 m, traversed start→goal (not a loop).
// ---------------------------------------------------------------------------

interface PathPiece {
  length: number;
  point: (u: number) => { x: number; y: number };
}

const line = (x1: number, y1: number, x2: number, y2: number): PathPiece => ({
  length: Math.hypot(x2 - x1, y2 - y1),
  point: (u) => ({ x: x1 + (x2 - x1) * u, y: y1 + (y2 - y1) * u }),
});

const arc = (cx: number, cy: number, r: number, a1: number, a2: number): PathPiece => ({
  length: Math.abs(a2 - a1) * r,
  point: (u) => ({
    x: cx + r * Math.cos(a1 + (a2 - a1) * u),
    y: cy + r * Math.sin(a1 + (a2 - a1) * u),
  }),
});

const HAIRPIN_R = 0.15;

const serpentinePieces: PathPiece[] = [
  line(0.15, 0.2, 0.75, 0.2),
  arc(0.75, 0.35, HAIRPIN_R, -Math.PI / 2, Math.PI / 2),
  line(0.75, 0.5, 0.25, 0.5),
  arc(0.25, 0.65, HAIRPIN_R, -Math.PI / 2, -(3 * Math.PI) / 2),
  line(0.25, 0.8, 0.85, 0.8),
];

const serpentineTotal = serpentinePieces.reduce((sum, p) => sum + p.length, 0);

export const serpentinePoint = (t: number): { x: number; y: number } => {
  let remaining = Math.max(0, Math.min(1, t)) * serpentineTotal;
  for (const piece of serpentinePieces) {
    if (remaining <= piece.length) return piece.point(remaining / piece.length);
    remaining -= piece.length;
  }
  return serpentinePieces[serpentinePieces.length - 1].point(1);
};

export const serpentineBoard: BoardState = {
  version: 1,
  id: 'track-serpentine',
  name: 'Racing 🏎️ (1.0m × 1.0m)',
  width: 1.0,
  height: 1.0,
  elements: [
    // Start ON the line at its beginning, heading east along the first straight.
    { kind: 'start', x: 0.15, y: 0.2, heading: 0 },
    { kind: 'goal', x: 0.85, y: 0.8, toleranceCm: 5 },
    ...sampleCurve(serpentinePoint, 200),
  ],
};
