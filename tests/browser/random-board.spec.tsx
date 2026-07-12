import { describe, it, expect, beforeEach } from 'vitest';
import { page } from '@vitest/browser/context';
import { render } from 'vitest-browser-react';
import App from '../../src/App';
import { storeBridge } from './helpers/store-bridge';
import { RANDOM_BOARD_ID, isBoardSolvable } from '../../src/sim/boards/random';
import { bundledBoards } from '../../src/sim/boards/default';

describe('random-board: generate button', () => {
  beforeEach(async () => {
    await storeBridge.resetAll();
    render(<App />);
  });

  it('clicking "Random board" loads a solvable random board into the simulator', async () => {
    await page.getByRole('tab', { name: /boards/i }).click();
    await page.getByRole('button', { name: /random board/i }).click();

    // Store now holds a transient random board, active, and the sim board matches it.
    const random = storeBridge.boardsStore().randomBoard;
    expect(random).not.toBeNull();
    expect(random!.id).toBe(RANDOM_BOARD_ID);
    expect(isBoardSolvable(random!)).toBe(true);
    expect(storeBridge.boardsStore().activeBoardId).toBe(RANDOM_BOARD_ID);
    expect(storeBridge.simStore().board.id).toBe(RANDOM_BOARD_ID);

    // The robot is reset to the start corner, ready to run under the same rules.
    expect(storeBridge.simStore().status).toBe('idle');
    expect(storeBridge.simStore().robot.x).toBeCloseTo(0.05, 6);
    expect(storeBridge.simStore().robot.y).toBeCloseTo(0.05, 6);

    // The random board appears in the list with an "Active" badge.
    await expect.element(page.getByText(/active/i)).toBeVisible();
  });

  it('clicking again regenerates a fresh, still-solvable board', async () => {
    await page.getByRole('tab', { name: /boards/i }).click();
    await page.getByRole('button', { name: /random board/i }).click();
    const first = storeBridge.boardsStore().randomBoard;

    await page.getByRole('button', { name: /random board/i }).click();
    const second = storeBridge.boardsStore().randomBoard;

    expect(second).not.toBe(first);
    expect(second!.id).toBe(RANDOM_BOARD_ID);
    expect(isBoardSolvable(second!)).toBe(true);
    // Still exactly the bundled boards saved — random never pollutes the list.
    expect(storeBridge.boardsStore().listBoards()).toHaveLength(bundledBoards.length);
  });
});
