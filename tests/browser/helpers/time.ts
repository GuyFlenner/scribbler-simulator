import { storeBridge } from './store-bridge';

const TICK_HZ = 60;
const TICK_DT = 1 / TICK_HZ;

export const time = {
  /**
   * Advance the simulator by N seconds of wall-clock-equivalent time, by calling
   * the store's tick() action directly. Bypasses requestAnimationFrame entirely,
   * which means tests are deterministic and don't depend on real-time scheduling
   * or the visibility/focus state of the test page.
   */
  runSimSeconds(seconds: number): void {
    const ticks = Math.round(seconds * TICK_HZ);
    const tick = storeBridge.simStore().tick;
    for (let i = 0; i < ticks; i++) tick(TICK_DT);
  },

  runSimMs(ms: number): void {
    this.runSimSeconds(ms / 1000);
  },
};
