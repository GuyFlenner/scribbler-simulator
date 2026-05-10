import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'vitest-browser-react';
import App from '../../src/App';
import { storeBridge } from './helpers/store-bridge';
import { canvas } from './helpers/canvas';
import { time } from './helpers/time';

const CANVAS_PX = 500;

describe('simulator canvas: real-pixel rendering', () => {
  beforeEach(async () => {
    await storeBridge.resetAll();
    render(<App />);
    // Let one rAF frame paint the initial board.
    await canvas.waitForFrame();
    await canvas.waitForFrame();
  });

  it('default-board-renders-content-at-A-and-B-marker-positions', () => {
    const board = storeBridge.simStore().board;
    const start = board.elements.find((e) => e.kind === 'start');
    const goal = board.elements.find((e) => e.kind === 'goal');
    if (!start || start.kind !== 'start') throw new Error('no start marker');
    if (!goal || goal.kind !== 'goal') throw new Error('no goal marker');

    const startPxX = Math.round((start.x / board.width) * CANVAS_PX);
    const startPxY = Math.round((start.y / board.height) * CANVAS_PX);
    const goalPxX = Math.round((goal.x / board.width) * CANVAS_PX);
    const goalPxY = Math.round((goal.y / board.height) * CANVAS_PX);

    expect(canvas.hasContent(startPxX, startPxY, 6)).toBe(true);
    expect(canvas.hasContent(goalPxX, goalPxY, 6)).toBe(true);
  });

  it('background-pixel-is-actually-background', () => {
    // Sanity check: a region clearly outside any element should be the cream colour.
    // Off-grid coordinate (grid lines fall at every 0.1 board units / 50 canvas px).
    const board = storeBridge.simStore().board;
    const midX = Math.round((0.13 / board.width) * CANVAS_PX);
    const midY = Math.round((0.58 / board.height) * CANVAS_PX);
    const px = canvas.samplePixel(midX, midY);
    expect(canvas.isBackground(px)).toBe(true);
  });

  it('stall-tints-robot-red', () => {
    const board = storeBridge.simStore().board;
    const obstacle = board.elements.find((e) => e.kind === 'obstacle');
    if (!obstacle || obstacle.kind !== 'obstacle') throw new Error('no obstacle');

    const w = window as Window & {
      __scribbler?: { simStore: typeof import('../../src/store/sim-store').useSimStore };
    };
    const sim = w.__scribbler!.simStore;
    sim.setState({
      robot: {
        ...storeBridge.simStore().robot,
        x: obstacle.x - 0.02,
        y: obstacle.y + obstacle.h / 2,
        heading: 0,
        vLinear: 0.15,
      },
      status: 'running',
      runStartedAt: 0,
    });

    time.runSimSeconds(0.5);
    expect(storeBridge.simStore().robot.isStalled).toBe(true);

    return canvas.waitForFrame().then(() => canvas.waitForFrame()).then(() => {
      const robot = storeBridge.simStore().robot;
      const pxX = Math.round((robot.x / board.width) * CANVAS_PX);
      const pxY = Math.round((robot.y / board.height) * CANVAS_PX);
      const px = canvas.samplePixel(pxX, pxY);
      // Stalled robot fills with #cc0000. R should dominate over G/B even with
      // anti-aliasing or partial overlap with the yellow nose accent.
      expect(px.r).toBeGreaterThan(150);
      expect(px.r).toBeGreaterThan(px.g + 40);
      expect(px.r).toBeGreaterThan(px.b + 40);
    });
  });
});
