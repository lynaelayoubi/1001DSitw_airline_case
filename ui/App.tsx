import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { fitToBudget } from '../calc/budget';
import { DEFAULT_ASSUMPTIONS } from '../calc/constants';
import { assessFleet } from '../calc/exposure';
import { compareRecommendations, recommendFleet } from '../calc/recommend';
import type { ExtensionEffects, Robustness } from '../calc/robustness';
import type { Assumptions, Dataset } from '../calc/types';
import dataset from '../data/fleet.json';
import FleetScreen from './screens/FleetScreen';

// The only place the dataset is read. Everything on screen comes out of assessFleet and
// recommendFleet, recomputed from the assumptions (the lease extension and any override); the
// robustness sweep runs in a worker and arrives a moment later.
const data = dataset as unknown as Dataset;

export default function App() {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const live = useDeferredValue(assumptions);
  const atRest = useMemo(() => recommendFleet(data, assessFleet(data, DEFAULT_ASSUMPTIONS), DEFAULT_ASSUMPTIONS), []);
  const fleet = useMemo(() => assessFleet(data, live), [live]);
  const plans = useMemo(() => recommendFleet(data, fleet, live), [fleet, live]);
  const comparison = useMemo(() => compareRecommendations(atRest, plans), [atRest, plans]);
  // A budget is a constraint on what to fund, not a model assumption; no limit until one is entered.
  const [budget, setBudget] = useState<number | null>(null);
  const budgetPlan = useMemo(() => fitToBudget(plans, budget ?? Infinity, data.asOf), [plans, budget]);

  const [robustness, setRobustness] = useState<{ id: number; result: Robustness; extension: ExtensionEffects } | null>(null);
  const worker = useRef<Worker | null>(null);
  const asked = useRef(0);
  const [askedId, setAskedId] = useState(0);
  useEffect(() => {
    const w = new Worker(new URL('./robustness.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; robustness: Robustness; extension: ExtensionEffects }>) => {
      if (e.data.id === asked.current) setRobustness({ id: e.data.id, result: e.data.robustness, extension: e.data.extension });
    };
    worker.current = w;
    return () => w.terminate();
  }, []);
  useEffect(() => {
    // Ask again once the assumptions have been still for a moment: a dragged control should not queue a sweep per step.
    const t = setTimeout(() => {
      asked.current += 1;
      setAskedId(asked.current);
      worker.current?.postMessage({ id: asked.current, assumptions: live });
    }, 250);
    return () => clearTimeout(t);
  }, [live]);

  return (
    <FleetScreen
      fleet={fleet}
      plans={plans}
      atRest={atRest}
      comparison={comparison}
      robustness={robustness?.result ?? null}
      extension={robustness?.extension ?? null}
      robustnessPending={!robustness || robustness.id !== askedId}
      budget={budget}
      onBudget={setBudget}
      budgetPlan={budgetPlan}
      assumptions={assumptions}
      onAssumptions={setAssumptions}
    />
  );
}
