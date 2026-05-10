import type { BoardState } from './schema';

export const defaultBoard: BoardState = {
  version: 1,
  id: 'default',
  name: 'Default 1m × 1m board',
  width: 1.0,
  height: 1.0,
  elements: [
    { kind: 'start', x: 0.05, y: 0.05, heading: 0 },
    { kind: 'goal', x: 0.92, y: 0.92, toleranceCm: 5 },
    { kind: 'obstacle', x: 0.3, y: 0.2, w: 0.08, h: 0.06 },
    { kind: 'obstacle', x: 0.6, y: 0.65, w: 0.08, h: 0.08 },
    { kind: 'bonus', x: 0.45, y: 0.5, toleranceCm: 8 },
  ],
};
