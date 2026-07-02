---
name: cross-button-press-flow-was-test-uncovered-until-2026-05-14
description: "Until d772e63, no test exercised pressButton → pressButton sequences through sim-store. Runtime tests covered single programs only. This is how the diagonal-drive bug shipped."
metadata: 
  node_type: memory
  type: project
---

Until commit `d772e63` (2026-05-14), the test suite had a structural gap: every prior test ran a single program in isolation via `runtime.test.ts` or `physics.test.ts`. No test exercised the public sim-store API across multiple consecutive `pressButton` calls. The interrupt path inside `sim-store.ts pressButton` had zero direct coverage, which is exactly how the diagonal-drive bug reached the 8yo's QA: a press that interrupts an in-progress rotate bypasses the natural-completion heading-snap.

**Why:** The runtime is well-covered at the program level, and the store felt like a thin glue layer that didn't need its own tests. But the store is where button-press semantics live — interrupt detection, replay queueing, status transitions, run recording. Skipping it left the most user-visible flow untested.

**How to apply:**
- When a new bug surfaces in button-press behaviour, default to writing the regression test in `src/store/sim-store.test.ts`, not in `runtime.test.ts`. The runtime tests cannot reproduce interrupt scenarios because they don't carry the activeProgram lifecycle.
- For any future change to `pressButton`, `tick`, `resetBoard`, `setBoard`, or `startReplay` in `sim-store.ts`, add a corresponding store-level test, not just a runtime/physics test.
- The store test pattern is: `beforeEach` resets localStorage + boards-store + sets a blank board with a start marker; then `pressButton(N, [...steps])` (always pass `steps` explicitly since `hardcodedBehaviors` is empty); then `advance(120)` for typical program duration.

Related: [[feedback_robot_size]] explains the heading-snap math; this memory explains where the snap was missing.
