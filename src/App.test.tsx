import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from './App';
import { useSimStore } from './store/sim-store';
import { defaultBoard } from './sim/boards/default';
import { makeRobotState } from './sim/physics';

beforeEach(() => {
  useSimStore.getState().resetBoard();
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
