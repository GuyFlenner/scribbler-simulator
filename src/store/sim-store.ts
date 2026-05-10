import { create } from 'zustand';
import type { BoardState } from '../sim/boards/schema';
import { defaultBoard } from '../sim/boards/default';
import { findBehavior } from '../sim/behaviors/hardcoded';
import { makeRobotState, tick } from '../sim/physics';
import { startProgram, type ProgramHandle } from '../sim/runtime';
import type { Step } from '../sim/behaviors/schema';
import type { RobotState, SimState, SimStatus } from '../sim/types';

const startMarker = (board: BoardState): { x: number; y: number; heading: number } => {
  const start = board.elements.find((el) => el.kind === 'start');
  if (start && start.kind === 'start') return { x: start.x, y: start.y, heading: start.heading };
  return { x: 0, y: 0, heading: 0 };
};

interface SimStoreState extends SimState {
  pressCount: number;
  pressButton: (presses: number, steps?: Step[]) => void;
  tick: (dtSeconds: number) => void;
  resetBoard: () => void;
}

let activeProgram: ProgramHandle | null = null;

const initialRobot = (): RobotState => {
  const start = startMarker(defaultBoard);
  return makeRobotState(start);
};

export const useSimStore = create<SimStoreState>((set, get) => ({
  robot: initialRobot(),
  board: defaultBoard,
  tickIndex: 0,
  status: 'idle' as SimStatus,
  runStartedAt: null,
  pressCount: 0,

  pressButton: (presses: number, steps?: Step[]) => {
    const resolvedSteps = steps ?? findBehavior(presses)?.steps;
    if (!resolvedSteps || resolvedSteps.length === 0) return;
    activeProgram = startProgram(resolvedSteps);
    const state = get();
    const startedAt = state.runStartedAt ?? Date.now();
    set({
      pressCount: presses,
      status: 'running',
      runStartedAt: startedAt,
      robot: { ...state.robot, isStalled: false },
    });
  },

  tick: (dtSeconds: number) => {
    const state = get();

    let nextRobot = state.robot;
    if (activeProgram) {
      const { vLinear, vAngular, done } = activeProgram.step(state.robot, dtSeconds);
      nextRobot = { ...state.robot, vLinear, vAngular };
      if (done) {
        activeProgram = null;
        nextRobot = { ...nextRobot, vLinear: 0, vAngular: 0 };
      }
    }

    const physicsResult = tick({ ...state, robot: nextRobot }, dtSeconds);
    set({
      robot: physicsResult.robot,
      board: physicsResult.board,
      tickIndex: physicsResult.tickIndex,
      status: physicsResult.status,
    });
  },

  resetBoard: () => {
    activeProgram = null;
    set({
      robot: initialRobot(),
      board: defaultBoard,
      tickIndex: 0,
      status: 'idle',
      runStartedAt: null,
      pressCount: 0,
    });
  },
}));
