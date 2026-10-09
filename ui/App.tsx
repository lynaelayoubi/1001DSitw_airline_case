import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fitToBudget } from '../calc/budget';
import { DEFAULT_ASSUMPTIONS } from '../calc/constants';
import { applyCorrections } from '../calc/corrections';
import { closingDecisions } from '../calc/deadlines';
import { assessFleet } from '../calc/exposure';
import { leaseOf } from '../calc/lease';
import { readiness } from '../calc/readiness';
import { recommendFleet } from '../calc/recommend';
import type { ExtensionEffects, Robustness } from '../calc/robustness';
import type { Dataset } from '../calc/types';
import { whatIfChoices } from '../calc/whatif';
import dataset from '../data/fleet.json';
import { useDemo } from './demo';
import Shell from './screens/Shell';

// The only place the dataset is read. Today's plan comes out of assessFleet and recommendFleet at the
// default assumptions, on the leases as the leasing team has corrected them (calc/corrections.ts —
// with no correction, the data as read). Nothing changes the assumptions behind it: a different world
// belongs to a scenario (calc/scenario.ts), priced against this plan on the Scenarios page. The
// robustness sweep runs in a worker and arrives a moment later.
const asRead = dataset as unknown as Dataset;

export default function App() {
  const { corrections } = useDemo();
  const data = useMemo(() => applyCorrections(asRead, corrections), [corrections]);
  // The plan at rest is on the leases as read, so a row whose action a correction changes says what it was.
  const atRest = useMemo(() => recommendFleet(asRead, assessFleet(asRead, DEFAULT_ASSUMPTIONS), DEFAULT_ASSUMPTIONS), []);
  const fleet = useMemo(() => assessFleet(data, DEFAULT_ASSUMPTIONS), [data]);
  const plans = useMemo(() => recommendFleet(data, fleet, DEFAULT_ASSUMPTIONS), [data, fleet]);
  // A budget is a constraint on what to fund, not a model assumption; no limit until one is entered.
  const [budget, setBudget] = useState<number | null>(null);
  const budgetPlan = useMemo(() => fitToBudget(plans, budget ?? Infinity, data.asOf), [plans, budget, data]);
  const closing = useMemo(() => closingDecisions(plans, data.asOf), [plans, data]);
  const ready = useMemo(() => readiness(data, fleet, plans), [data, fleet, plans]);
  // What a scenario's decisions can be, on each returning tail.
  const choices = useMemo(() => whatIfChoices(data, fleet), [data, fleet]);
  // The lease behind any tail: as corrected (what the calculation uses), and as read.
  const leaseFor = useCallback((tail: string) => leaseOf(data, tail), [data]);
  const leaseAsRead = useCallback((tail: string) => leaseOf(asRead, tail), []);

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
    // Sweep today's plan: at the default assumptions, on the leases as corrected. Ask again when a correction lands.
    const t = setTimeout(() => {
      asked.current += 1;
      setAskedId(asked.current);
      worker.current?.postMessage({ id: asked.current, assumptions: DEFAULT_ASSUMPTIONS, corrections });
    }, 250);
    return () => clearTimeout(t);
  }, [corrections]);

  return (
    <Shell
      data={data}
      fleet={fleet}
      plans={plans}
      atRest={atRest}
      robustness={robustness?.result ?? null}
      extension={robustness?.extension ?? null}
      robustnessPending={!robustness || robustness.id !== askedId}
      budget={budget}
      onBudget={setBudget}
      budgetPlan={budgetPlan}
      closing={closing}
      choices={choices}
      leaseOf={leaseFor}
      leaseAsRead={leaseAsRead}
      readiness={ready}
    />
  );
}
