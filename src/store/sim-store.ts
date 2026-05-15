import { create } from 'zustand';
import type { BoardState } from '../sim/boards/schema';
import { mazeBoard, findBundledBoard } from '../sim/boards/default';
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

// Snap a heading (radians) to an exact multiple of 90° when within ±10°,
// otherwise to the nearest integer degree. Guarantees subsequent drives
// travel along a clean axis after a turn. Called when a program completes
// naturally in tick().
const snapHeading = (heading: number): number => {
  const degreesRaw = (heading * 180) / Math.PI;
  const nearestMul90 = Math.round(degreesRaw / 90) * 90;
  const snappedDegrees =
    Math.abs(degreesRaw - nearestMul90) <= 10 ? nearestMul90 : Math.round(degreesRaw);
  return snappedDegrees * (Math.PI / 180);
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

const resolveInitialBoard = (): BoardState => {
  const { activeBoardId, customBoards } = useBoardsStore.getState();
  const bundled = findBundledBoard(activeBoardId);
  if (bundled) return bundled;
  return customBoards[activeBoardId] ?? mazeBoard;
};

const initialBoard = resolveInitialBoard();

export const useSimStore = create<SimStoreState>((set, get) => ({
  robot: initialRobot(initialBoard),
  board: initialBoard,
  tickIndex: 0,
  status: 'idle' as SimStatus,
  runStartedAt: null,
  pressCount: 0,
  currentRunEvents: [],
  replayQueue: null,
  bonusHit: false,

  pressButton: (presses, steps) => {
    // Block new presses while a program is running — prevents diagonal movement
    // from an interrupt landing mid-rotation at a non-cardinal heading.
    if (activeProgram !== null) return;
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
    let programJustCompleted = false;
    if (activeProgram) {
      const { vLinear, vAngular, done } = activeProgram.step(state.robot, dtSeconds, state.board);
      nextRobot = { ...state.robot, vLinear, vAngular };
      if (done) {
        activeProgram = null;
        programJustCompleted = true;
        nextRobot = {
          ...nextRobot,
          vLinear: 0,
          vAngular: 0,
          heading: snapHeading(nextRobot.heading),
        };
      }
    }

    const physicsResult = tick({ ...state, robot: nextRobot }, dtSeconds);
    const prevStatus = state.status;
    // When a program finishes naturally (no stall, no goal), return to idle so
    // buttons re-enable. physics.tick() never transitions running → idle by itself.
    const nextStatus: SimStatus =
      programJustCompleted && physicsResult.status === 'running' ? 'idle' : physicsResult.status;
    const bonusHit =
      state.bonusHit ||
      (physicsResult.status === 'running' &&
        checkBonusHit(physicsResult.robot, physicsResult.board));
    set({
      robot: physicsResult.robot,
      board: physicsResult.board,
      tickIndex: physicsResult.tickIndex,
      status: nextStatus,
      bonusHit,
    });
    recordRunIfDone(prevStatus, nextStatus, get());
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
