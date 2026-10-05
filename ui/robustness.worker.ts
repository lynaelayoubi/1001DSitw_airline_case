// Runs the robustness sweep and the lease-extension sweep (calc/robustness.ts) off the main thread:
// together they re-recommend the fleet about three hundred times, over a second — too long to hold
// up the screen.

import { computeExtensionEffects, computeRobustness } from '../calc/robustness';
import type { Assumptions, Dataset } from '../calc/types';
import dataset from '../data/fleet.json';

const data = dataset as unknown as Dataset;

self.onmessage = (e: MessageEvent<{ id: number; assumptions: Assumptions }>) => {
  const { id, assumptions } = e.data;
  self.postMessage({ id, robustness: computeRobustness(data, assumptions), extension: computeExtensionEffects(data, assumptions) });
};
