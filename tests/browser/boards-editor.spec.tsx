import { describe, it, expect, beforeEach } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-react';
import App from '../../src/App';
import { storeBridge } from './helpers/store-bridge';
import { time } from './helpers/time';

describe('boards-editor: full lifecycle', () => {
  beforeEach(async () => {
    await storeBridge.resetAll();
    render(<App />);
  });

  it('opens the boards panel and shows the default board', async () => {
    await page.getByRole('tab', { name: /boards/i }).click();
    await expect.element(page.getByText(/default board \(1\.0m/i)).toBeVisible();
  });

  it('clicking + new-board opens the editor with a blank custom board', async () => {
    await page.getByRole('tab', { name: /boards/i }).click();
    await page.getByRole('button', { name: /new board/i }).click();

    // The board editor opens with a "Save" / "Cancel" pair and a name field.
    await expect.element(page.getByRole('button', { name: /^save$/i })).toBeVisible();
    await expect.element(page.getByRole('button', { name: /^cancel$/i })).toBeVisible();

    // Cancel returns to the boards list without persisting.
    await page.getByRole('button', { name: /^cancel$/i }).click();
    expect(Object.keys(storeBridge.boardsStore().customBoards)).toHaveLength(0);
  });

  it('successful run records a run in history and replay re-runs it', async () => {
    // Configure press-2 → drive 30cm, then drive once to log a press event,
    // then snap the robot to the goal so the run completes and is recorded.
    storeBridge.editorStore().setBehavior(2, [{ kind: 'drive', cm: 30 }]);
    const board = storeBridge.simStore().board;
    const goal = board.elements.find((el) => el.kind === 'goal');
    if (!goal || goal.kind !== 'goal') throw new Error('no goal');

    await page.getByLabelText(/press reset 2 times/i).click();
    expect(storeBridge.simStore().status).toBe('running');

    const w = window as Window & {
      __scribbler?: { simStore: typeof import('../../src/store/sim-store').useSimStore };
    };
    const sim = w.__scribbler!.simStore;
    // Snap to goal — preserves the press event in currentRunEvents.
    sim.setState({
      robot: {
        ...storeBridge.simStore().robot,
        x: goal.x,
        y: goal.y,
        heading: 0,
      },
      runStartedAt: Date.now() - 2000,
    });
    storeBridge.simStore().tick(1 / 60);

    // Goal reached → store recorded the run.
    expect(storeBridge.simStore().status).toBe('reached-goal');
    const runs = storeBridge.boardsStore().runsByBoard[board.id];
    expect(runs).toBeDefined();
    expect(runs!).toHaveLength(1);
    expect(runs![0].pressCountTotal).toBe(1);

    // Switch to Boards → see the run in history.
    await page.getByRole('tab', { name: /boards/i }).click();
    await expect.element(page.getByRole('button', { name: /replay/i })).toBeVisible();

    // Replay clears state and re-fires the press event at the recorded tick.
    await page.getByRole('button', { name: /replay/i }).click();
    expect(storeBridge.simStore().status).toBe('running');
    expect(storeBridge.simStore().replayQueue).not.toBeNull();

    // Drive the replay forward — the queued press event should fire and move the robot.
    time.runSimSeconds(2.5);
    const finalX = storeBridge.simStore().robot.x;
    // Robot starts at (0.05, 0.05) after replay reset; press 2 drives ~30cm east.
    expect(finalX).toBeGreaterThan(0.25);
  });
});
