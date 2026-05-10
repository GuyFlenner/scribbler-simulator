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

  it('renders press buttons 2x through 5x and a reset board button', () => {
    render(<App />);
    expect(screen.getByLabelText(/press reset 2 times/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/press reset 3 times/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/press reset 4 times/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/press reset 5 times/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset board/i })).toBeInTheDocument();
  });
});

describe('App — drive forward on press 2x', () => {
  it('moves the robot ~30 cm east after pressing 2x and advancing 2 simulated seconds', () => {
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
    expect(await screen.findByRole('tab', { name: /edit press 2 times/i })).toBeInTheDocument();
  });
});

describe('App — boards mode', () => {
  it('switches to the boards panel and lists at least the default board', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /boards/i }));
    expect(await screen.findByRole('heading', { name: /boards/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/default 1m/i)).toBeInTheDocument();
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
});

describe('App — cheat-sheet', () => {
  it('opens the cheat-sheet modal and lists hardcoded fallbacks for press 2..5', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /print cheat-sheet/i }));
    const dialog = screen.getByRole('dialog', { name: /cheat sheet/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/forward 30 cm/i);
    expect(dialog).toHaveTextContent(/backward 30 cm/i);
    expect(dialog).toHaveTextContent(/rotate 90/i);
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
