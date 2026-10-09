// Runs the robustness sweep and the lease-extension sweep (calc/robustness.ts) off the main thread:
// together they re-recommend the fleet about three hundred times, over a second — too long to hold
// up the screen. It sweeps the leases as the leasing team has corrected them, as the screen does.

import { applyCorrections, type Correction } from '../calc/corrections';
import { computeExtensionEffects, computeRobustness } from '../calc/robustness';
import type { Assumptions, Dataset } from '../calc/types';
import dataset from '../data/fleet.json';

const asRead = dataset as unknown as Dataset;

self.onmessage = (e: MessageEvent<{ id: number; assumptions: Assumptions; corrections: Correction[] }>) => {
  const { id, assumptions, corrections } = e.data;
  const data = applyCorrections(asRead, corrections ?? []);
  self.postMessage({ id, robustness: computeRobustness(data, assumptions), extension: computeExtensionEffects(data, assumptions) });
};
