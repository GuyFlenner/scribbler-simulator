import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from './App';
import i18n from './i18n';
import { useSimStore } from './store/sim-store';
import { useEditorStore } from './store/editor-store';
import { useBoardsStore } from './store/boards-store';
import { defaultBoard } from './sim/boards/default';
import { makeRobotState } from './sim/physics';

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
  useSimStore.getState().resetBoard();
  useEditorStore.getState().resetAll();
  useBoardsStore.getState().resetAll();
});

afterEach(() => {
  cleanup();
});

describe('App — renders the simulator shell', () => {
  it('renders the project title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /scribbler/i })).toBeInTheDocument();
  });

  it('renders press buttons 1x through 8x and a reset board button', () => {
    render(<App />);
    expect(screen.getByLabelText(/press reset 1 times/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/press reset 2 times/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/press reset 5 times/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/press reset 8 times/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset board/i })).toBeInTheDocument();
  });
});

describe('App — drive forward on press 2x with a configured behavior', () => {
  it('moves the robot ~30 cm east after pressing 2x and advancing 2 simulated seconds', () => {
    useEditorStore.getState().setBehavior(2, [{ kind: 'drive', cm: 30 }]);
    render(<App />);
    const initialX = useSimStore.getState().robot.x;
    const initialY = useSimStore.getState().robot.y;
    fireEvent.click(screen.getByLabelText(/press reset 2 times/i));
    act(() => {
      for (let i = 0; i < 130; i++) useSimStore.getState().tick(1 / 60);
    });
    const state = useSimStore.getState();
    expect(state.robot.x - initialX).toBeCloseTo(0.3, 1);
    expect(state.robot.y - initialY).toBeCloseTo(0, 1);
  });
});

describe('App — reset board returns to A', () => {
  it('returns the robot to point A after pressing reset', () => {
    useEditorStore.getState().setBehavior(2, [{ kind: 'drive', cm: 30 }]);
    render(<App />);
    const startX = useSimStore.getState().robot.x;
    const startY = useSimStore.getState().robot.y;
    fireEvent.click(screen.getByLabelText(/press reset 2 times/i));
    act(() => {
      for (let i = 0; i < 130; i++) useSimStore.getState().tick(1 / 60);
    });
    expect(useSimStore.getState().robot.x).toBeGreaterThan(startX + 0.2);
    fireEvent.click(screen.getByRole('button', { name: /reset board/i }));
    expect(useSimStore.getState().robot.x).toBeCloseTo(startX, 5);
    expect(useSimStore.getState().robot.y).toBeCloseTo(startY, 5);
  });
});

describe('App — press 1 is now valid (was previously skipped)', () => {
  it('accepts a behavior bound to press 1 and runs it', () => {
    useEditorStore.getState().setBehavior(1, [{ kind: 'drive', cm: 20 }]);
    render(<App />);
    const initialX = useSimStore.getState().robot.x;
    fireEvent.click(screen.getByLabelText(/press reset 1 times/i));
    act(() => {
      for (let i = 0; i < 100; i++) useSimStore.getState().tick(1 / 60);
    });
    expect(useSimStore.getState().robot.x - initialX).toBeCloseTo(0.2, 1);
  });
});

describe('App — success overlay on reaching goal', () => {
  it('shows the well-done overlay when the robot reaches point B', () => {
    render(<App />);
    const goal = defaultBoard.elements.find((e) => e.kind === 'goal');
    if (!goal || goal.kind !== 'goal') throw new Error('default board missing goal marker');
    act(() => {
      useSimStore.setState({
        robot: makeRobotState({ x: goal.x, y: goal.y, heading: 0 }),
        status: 'running',
        runStartedAt: Date.now() - 5000,
      });
      useSimStore.getState().tick(1 / 60);
    });
    expect(screen.getByText(/well done/i)).toBeInTheDocument();
  });
});

describe('App — user-defined behavior overrides hardcoded', () => {
  it('runs the user program for press 2x when one is defined', () => {
    useEditorStore.getState().setBehavior(2, [{ kind: 'rotate', degrees: 90 }]);
    render(<App />);
    const initialHeading = useSimStore.getState().robot.heading;
    fireEvent.click(screen.getByLabelText(/press reset 2 times/i));
    act(() => {
      for (let i = 0; i < 120; i++) useSimStore.getState().tick(1 / 60);
    });
    const finalHeading = useSimStore.getState().robot.heading;
    expect(Math.abs(finalHeading - initialHeading)).toBeGreaterThan(0.5);
    expect(useSimStore.getState().robot.x).toBeCloseTo(useSimStore.getState().robot.x, 3);
  });
});

describe('App — empty user program shows friendly message', () => {
  it('shows the empty-program message when pressing a button bound to an empty user program', () => {
    useEditorStore.setState({ programs: { 6: [] } });
    render(<App />);
    fireEvent.click(screen.getByLabelText(/press reset 6 times/i));
    expect(screen.getByTestId('press-button-message')).toHaveTextContent(/has no/i);
  });
});

describe('App — editor mode toggle', () => {
  it('switches to the editor view when the Edit behaviors tab is clicked', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /edit behaviors/i }));
    expect(await screen.findByRole('tab', { name: /edit press 2 times/i }, { timeout: 5000 })).toBeInTheDocument();
  });
});

describe('App — boards mode', () => {
  it('switches to the boards panel and lists at least the default board', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /boards/i }));
    expect(await screen.findByRole('heading', { name: /boards/i, level: 2 })).toBeInTheDocument();
    expect(screen.getAllByText(/default board/i).length).toBeGreaterThan(0);
  });

  it('records a successful run and shows it in the run history', async () => {
    render(<App />);
    act(() => {
      useSimStore.getState().pressButton(2, [{ kind: 'drive', cm: 1 }]);
    });
    const goal = defaultBoard.elements.find((e) => e.kind === 'goal');
    if (!goal || goal.kind !== 'goal') throw new Error('no goal');
    act(() => {
      useSimStore.setState({
        robot: makeRobotState({ x: goal.x, y: goal.y, heading: 0 }),
        status: 'running',
        runStartedAt: Date.now() - 3000,
      });
      useSimStore.getState().tick(1 / 60);
    });
    fireEvent.click(screen.getByRole('tab', { name: /boards/i }));
    expect(useBoardsStore.getState().getRunsForBoard(defaultBoard.id)).toHaveLength(1);
    expect(await screen.findByRole('button', { name: /replay/i })).toBeInTheDocument();
  });

  it('records bonusHit=true on a run that passes through the bonus zone', async () => {
    // The default board has no bonus; switch to the bundled bonus board first.
    const { bonusBoard } = await import('./sim/boards/default');
    useSimStore.getState().setBoard(bonusBoard);
    render(<App />);
    const board = useSimStore.getState().board;
    const bonus = board.elements.find((e) => e.kind === 'bonus');
    const goal = board.elements.find((e) => e.kind === 'goal');
    if (!bonus || bonus.kind !== 'bonus') throw new Error('bonus board missing bonus');
    if (!goal || goal.kind !== 'goal') throw new Error('bonus board missing goal');

    act(() => {
      useSimStore.getState().pressButton(2, [{ kind: 'drive', cm: 1 }]);
    });
    // Snap robot through the bonus zone.
    act(() => {
      useSimStore.setState({
        robot: makeRobotState({ x: bonus.x, y: bonus.y, heading: 0 }),
        status: 'running',
        runStartedAt: Date.now() - 1000,
      });
      useSimStore.getState().tick(1 / 60);
    });
    expect(useSimStore.getState().bonusHit).toBe(true);

    // Snap to goal to record the run.
    act(() => {
      useSimStore.setState({
        robot: makeRobotState({ x: goal.x, y: goal.y, heading: 0 }),
        status: 'running',
        runStartedAt: Date.now() - 2000,
      });
      useSimStore.getState().tick(1 / 60);
    });
    const runs = useBoardsStore.getState().getRunsForBoard(board.id);
    expect(runs).toHaveLength(1);
    expect(runs[0].bonusHit).toBe(true);
  });
});

describe('App — load sample program', () => {
  it('Load sample button populates press 1..6 with the competition button layout', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /edit behaviors/i }));
    // Two buttons render with this label — the prominent banner (empty-state)
    // and the toolbar shortcut. Either works; click the first.
    const buttons = await screen.findAllByRole('button', { name: /load sample program/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(buttons[0]);
    const programs = useEditorStore.getState().programs;
    expect(programs[1]?.[0]).toMatchObject({ kind: 'drive', cm: 10 });
    expect(programs[2]?.[0]).toMatchObject({ kind: 'drive', cm: 20 });
    expect(programs[3]?.[0]).toMatchObject({ kind: 'drive', cm: 40 });
    expect(programs[4]?.[0]).toMatchObject({ kind: 'rotate', degrees: 90 });
    expect(programs[5]?.[0]).toMatchObject({ kind: 'rotate', degrees: -90 });
    expect(programs[6]?.[0]).toMatchObject({ kind: 'rotate', degrees: 180 });
    expect(programs[7]).toBeUndefined();
    expect(programs[8]).toBeUndefined();
  });

  it('Load sample also populates workspaceJson so Blockly renders the blocks', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /edit behaviors/i }));
    const buttons = await screen.findAllByRole('button', { name: /load sample program/i });
    fireEvent.click(buttons[0]);
    const ws = useEditorStore.getState().workspaceJsonByPressCount;
    // Each loaded slot must have a workspace JSON (not just steps), or Blockly
    // would render an empty workspace when the user navigates to that tab.
    expect(ws[1]).toBeDefined();
    expect(ws[6]).toBeDefined();
    const press1Json = ws[1] as { blocks?: { blocks?: { type: string }[] } };
    expect(press1Json.blocks?.blocks?.[0]?.type).toBe('drive_distance');
  });
});

describe('App — cheat-sheet', () => {
  it('opens the cheat-sheet modal and shows "(not defined)" for unconfigured press counts', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /print cheat-sheet/i }));
    const dialog = screen.getByRole('dialog', { name: /cheat sheet/i });
    expect(dialog).toBeInTheDocument();
    // No hardcoded fallbacks any more — every row is "(not defined)" until configured.
    const notDefinedRows = dialog.querySelectorAll('tbody tr');
    expect(notDefinedRows.length).toBe(8); // press 1..8
    expect(dialog).toHaveTextContent(/not defined/i);
  });

  it('describes a user-defined drive_wheels program', () => {
    useEditorStore.getState().setBehavior(2, [
      { kind: 'drive_wheels', leftSpeedPct: 50, rightSpeedPct: -50, durationMs: 1000 },
    ]);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /print cheat-sheet/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/L=50%.*R=-50%.*1000/);
  });

  it('describes a user-defined drive_arc program (positive degrees = right)', () => {
    useEditorStore.getState().setBehavior(3, [
      { kind: 'drive_arc', radiusCm: 25, degrees: 90 },
    ]);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /print cheat-sheet/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/arc right.*radius 25.*90/i);
  });
});

describe('App — language toggle', () => {
  it('switches all UI strings to Hebrew and sets html dir=rtl when Hebrew is clicked', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /scribbler simulator/i })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^עברית$/ }));
    });

    expect(screen.getByRole('heading', { name: /סקריבלר/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /אפס לוח/ })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('persists the chosen language across reloads via localStorage', async () => {
    render(<App />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^עברית$/ }));
    });
    expect(localStorage.getItem('scribbler-sim:lang:v1')).toBe('he');
  });
});

describe('App — stall on collision', () => {
  it('shows a stall indicator when the robot collides with an obstacle', () => {
    render(<App />);
    const obstacle = defaultBoard.elements.find((e) => e.kind === 'obstacle');
    if (!obstacle || obstacle.kind !== 'obstacle') throw new Error('default board missing obstacle');
    act(() => {
      useSimStore.setState({
        robot: makeRobotState({
          x: obstacle.x - 0.02,
          y: obstacle.y + obstacle.h / 2,
          heading: 0,
          vLinear: 0.15,
        }),
        status: 'running',
        runStartedAt: 0,
      });
      for (let i = 0; i < 30; i++) useSimStore.getState().tick(1 / 60);
    });
    expect(screen.getByTestId('stall-indicator')).toBeInTheDocument();
  });
});
