// Runs the robustness sweep (calc/robustness.ts) off the main thread: it re-recommends the fleet
// about two hundred times, which is most of a second — too long to hold up the screen.

import { computeRobustness } from '../calc/robustness';
import type { Assumptions, Dataset } from '../calc/types';
import dataset from '../data/fleet.json';

const data = dataset as unknown as Dataset;

self.onmessage = (e: MessageEvent<{ id: number; assumptions: Assumptions }>) => {
  const { id, assumptions } = e.data;
  self.postMessage({ id, robustness: computeRobustness(data, assumptions) });
};
