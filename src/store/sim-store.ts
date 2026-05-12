import { create } from 'zustand';
import type { BoardState } from '../sim/boards/schema';
import { defaultBoard } from '../sim/boards/default';
import { findBehavior } from '../sim/behaviors/hardcoded';
import { makeRobotState, tick } from '../sim/physics';
import { startProgram, type ProgramHandle } from '../sim/runtime';
import type { Step } from '../sim/behaviors/schema';
import type { RobotState, SimState, SimStatus } from '../sim/types';
import { newRunId, sortEvents, type RunEvent, type RunRecord } from '../sim/replay';
import { useBoardsStore } from './boards-store';

const startMarker = (board: BoardState): { x: number; y: number; heading: number } => {
  const start = board.elements.find((el) => el.kind === 'start');
  if (start && start.kind === 'start') return { x: start.x, y: start.y, heading: start.heading };
  return { x: 0, y: 0, heading: 0 };
};

interface SimStoreState extends SimState {
  pressCount: number;
  currentRunEvents: RunEvent[];
  replayQueue: RunEvent[] | null;
  bonusHit: boolean;
  pressButton: (presses: number, steps?: Step[]) => void;
  tick: (dtSeconds: number) => void;
  resetBoard: () => void;
  setBoard: (board: BoardState) => void;
  startReplay: (record: RunRecord) => void;
}

const checkBonusHit = (robot: RobotState, board: BoardState): boolean => {
  for (const el of board.elements) {
    if (el.kind !== 'bonus') continue;
    const dx = robot.x - el.x;
    const dy = robot.y - el.y;
    if (Math.hypot(dx, dy) <= el.toleranceCm / 100) return true;
  }
  return false;
};

let activeProgram: ProgramHandle | null = null;

const initialRobot = (board: BoardState): RobotState => {
  const start = startMarker(board);
  return makeRobotState(start);
};

const recordRunIfDone = (
  prevStatus: SimStatus,
  nextStatus: SimStatus,
  state: SimStoreState,
): void => {
  if (prevStatus === nextStatus) return;
  if (nextStatus !== 'reached-goal' && nextStatus !== 'stalled') return;
  if (state.replayQueue) return;
  if (state.currentRunEvents.length === 0) return;
  const startedAt = state.runStartedAt ?? Date.now();
  const record: RunRecord = {
    id: newRunId(),
    boardId: state.board.id,
    startedAt,
    durationMs: Date.now() - startedAt,
    events: sortEvents(state.currentRunEvents),
    outcome: nextStatus,
    pressCountTotal: state.currentRunEvents.length,
    bonusHit: state.bonusHit,
  };
  useBoardsStore.getState().recordRun(record);
};

export const useSimStore = create<SimStoreState>((set, get) => ({
  robot: initialRobot(defaultBoard),
  board: defaultBoard,
  tickIndex: 0,
  status: 'idle' as SimStatus,
  runStartedAt: null,
  pressCount: 0,
  currentRunEvents: [],
  replayQueue: null,
  bonusHit: false,

  pressButton: (presses, steps) => {
    const resolvedSteps = steps ?? findBehavior(presses)?.steps;
    if (!resolvedSteps || resolvedSteps.length === 0) return;
    activeProgram = startProgram(resolvedSteps);
    const state = get();
    const startedAt = state.runStartedAt ?? Date.now();
    const event: RunEvent = {
      tickIndex: state.tickIndex,
      pressCount: presses,
      steps: resolvedSteps,
    };
    set({
      pressCount: presses,
      status: 'running',
      runStartedAt: startedAt,
      robot: { ...state.robot, isStalled: false },
      currentRunEvents: [...state.currentRunEvents, event],
    });
  },

  tick: (dtSeconds) => {
    const state = get();

    if (state.replayQueue && state.replayQueue.length > 0) {
      while (state.replayQueue.length > 0 && state.replayQueue[0].tickIndex <= state.tickIndex) {
        const ev = state.replayQueue.shift()!;
        activeProgram = startProgram(ev.steps);
        set({ status: 'running', runStartedAt: state.runStartedAt ?? Date.now() });
      }
    }

    let nextRobot = state.robot;
    if (activeProgram) {
      const { vLinear, vAngular, done } = activeProgram.step(state.robot, dtSeconds, state.board);
      nextRobot = { ...state.robot, vLinear, vAngular };
      if (done) {
        activeProgram = null;
        // Snap to exact 90° multiples when within ±10°, otherwise nearest degree.
        // The executeRotate corrective velocity already lands within ~1° of the
        // target; this snap locks the heading to an exact cardinal angle so
        // subsequent forward drives travel in a perfectly straight line.
        const degreesRaw = (nextRobot.heading * 180) / Math.PI;
        const nearestMul90 = Math.round(degreesRaw / 90) * 90;
        const snappedDegrees =
          Math.abs(degreesRaw - nearestMul90) <= 10 ? nearestMul90 : Math.round(degreesRaw);
        const snappedHeading = snappedDegrees * (Math.PI / 180);
        nextRobot = { ...nextRobot, vLinear: 0, vAngular: 0, heading: snappedHeading };
      }
    }

    const physicsResult = tick({ ...state, robot: nextRobot }, dtSeconds);
    const prevStatus = state.status;
    const bonusHit =
      state.bonusHit ||
      (physicsResult.status === 'running' &&
        checkBonusHit(physicsResult.robot, physicsResult.board));
    set({
      robot: physicsResult.robot,
      board: physicsResult.board,
      tickIndex: physicsResult.tickIndex,
      status: physicsResult.status,
      bonusHit,
    });
    recordRunIfDone(prevStatus, physicsResult.status, get());
  },

  resetBoard: () => {
    activeProgram = null;
    const board = get().board;
    set({
      robot: initialRobot(board),
      tickIndex: 0,
      status: 'idle',
      runStartedAt: null,
      pressCount: 0,
      currentRunEvents: [],
      replayQueue: null,
      bonusHit: false,
    });
  },

  setBoard: (board) => {
    activeProgram = null;
    set({
      board,
      robot: initialRobot(board),
      tickIndex: 0,
      status: 'idle',
      runStartedAt: null,
      pressCount: 0,
      currentRunEvents: [],
      replayQueue: null,
      bonusHit: false,
    });
  },

  startReplay: (record) => {
    activeProgram = null;
    const board = get().board;
    set({
      robot: initialRobot(board),
      tickIndex: 0,
      status: 'running',
      runStartedAt: Date.now(),
      pressCount: 0,
      currentRunEvents: [],
      replayQueue: sortEvents(record.events),
      bonusHit: false,
    });
  },
}));
