import type { Behavior } from './schema';

export const hardcodedBehaviors: Behavior[] = [
  {
    pressCount: 2,
    label: 'Forward 30 cm',
    steps: [{ kind: 'drive', cm: 30 }],
  },
  {
    pressCount: 3,
    label: 'Backward 30 cm',
    steps: [{ kind: 'drive', cm: -30 }],
  },
  {
    pressCount: 4,
    label: 'Rotate 90° right',
    steps: [{ kind: 'rotate', degrees: -90 }],
  },
  {
    pressCount: 5,
    label: 'Rotate 90° left',
    steps: [{ kind: 'rotate', degrees: 90 }],
  },
];

export const findBehavior = (pressCount: number): Behavior | undefined =>
  hardcodedBehaviors.find((b) => b.pressCount === pressCount);
