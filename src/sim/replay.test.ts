import { describe, it, expect } from 'vitest';
import { sortEvents, newRunId, type RunEvent } from './replay';

describe('replay — event sorting', () => {
  it('sorts events by tickIndex ascending', () => {
    const events: RunEvent[] = [
      { tickIndex: 30, pressCount: 3, steps: [] },
      { tickIndex: 10, pressCount: 2, steps: [] },
      { tickIndex: 20, pressCount: 4, steps: [] },
    ];
    expect(sortEvents(events).map((e) => e.tickIndex)).toEqual([10, 20, 30]);
  });

  it('does not mutate the input array', () => {
    const events: RunEvent[] = [
      { tickIndex: 5, pressCount: 2, steps: [] },
      { tickIndex: 1, pressCount: 3, steps: [] },
    ];
    const before = events.map((e) => e.tickIndex);
    sortEvents(events);
    expect(events.map((e) => e.tickIndex)).toEqual(before);
  });
});

describe('replay — run ids', () => {
  it('generates distinct ids on rapid calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(newRunId());
    expect(ids.size).toBe(50);
  });
});
