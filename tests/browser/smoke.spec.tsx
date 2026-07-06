import { describe, it, expect, beforeEach } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-react';
import App from '../../src/App';
import { storeBridge } from './helpers/store-bridge';
import { time } from './helpers/time';
import { defaultBoard } from '../../src/sim/boards/default';

describe('smoke: golden path', () => {
  beforeEach(async () => {
    await storeBridge.resetAll();
    // Pin to the open default board so drive-east tests don't hit maze walls.
    storeBridge.simStore().setBoard(defaultBoard);
    storeBridge.boardsStore().setActiveBoard(defaultBoard.id);
    render(<App />);
  });

  it('app-mounts-and-renders-title', async () => {
    await expect.element(page.getByRole('heading', { name: /scribbler simulator/i })).toBeVisible();
  });

  it('press-2x-moves-robot ~30cm east when press-2 is configured to drive 30cm', async () => {
    storeBridge.editorStore().setBehavior(2, [{ kind: 'drive', cm: 30 }]);
    const startX = storeBridge.simStore().robot.x;
    const startY = storeBridge.simStore().robot.y;

    await page.getByLabelText(/press reset 2 times/i).click();
    expect(storeBridge.simStore().status).toBe('running');

    time.runSimSeconds(2.2);

    const robot = storeBridge.simStore().robot;
    expect(robot.x - startX).toBeCloseTo(0.3, 1);
    expect(robot.y - startY).toBeCloseTo(0, 1);
  });

  it('reset-board-returns-to-A', async () => {
    storeBridge.editorStore().setBehavior(2, [{ kind: 'drive', cm: 30 }]);
    const startX = storeBridge.simStore().robot.x;
    const startY = storeBridge.simStore().robot.y;

    await page.getByLabelText(/press reset 2 times/i).click();
    time.runSimSeconds(2.2);
    expect(storeBridge.simStore().robot.x - startX).toBeGreaterThan(0.2);

    await page.getByRole('button', { name: /reset board/i }).click();
    expect(storeBridge.simStore().robot.x).toBeCloseTo(startX, 4);
    expect(storeBridge.simStore().robot.y).toBeCloseTo(startY, 4);
  });

  it('goal-overlay-on-reach', async () => {
    const board = storeBridge.simStore().board;
    const goal = board.elements.find((el) => el.kind === 'goal');
    if (!goal || goal.kind !== 'goal') throw new Error('default board has no goal');

    const w = window as Window & {
      __scribbler?: { simStore: typeof import('../../src/store/sim-store').useSimStore };
    };
    const sim = w.__scribbler!.simStore;
    sim.setState({
      robot: { ...storeBridge.simStore().robot, x: goal.x, y: goal.y, heading: 0 },
      status: 'running',
      runStartedAt: Date.now() - 3000,
    });
    storeBridge.simStore().tick(1 / 60);

    await expect.element(page.getByText(/well done/i)).toBeVisible();
  });

  it('editor-tab-shows-blockly-workspace (the freeze-regression test)', async () => {
    await page.getByRole('tab', { name: /edit behaviors/i }).click();

    // The workspace SVG is created by Blockly.inject — if the freeze-loop bug
    // returns, this either never appears or the page hangs.
    await expect
      .poll(() => document.querySelectorAll('svg.blocklySvg').length, { timeout: 5000 })
      .toBeGreaterThan(0);

    // Page must still be responsive — clicking a tab works.
    await page.getByRole('tab', { name: /edit press 3 times/i }).click();
    expect(storeBridge.editorStore().selectedPressCount).toBe(3);
  });
});
