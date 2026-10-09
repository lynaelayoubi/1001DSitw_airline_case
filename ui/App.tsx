import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { fitToBudget } from '../calc/budget';
import { DEFAULT_ASSUMPTIONS } from '../calc/constants';
import { applyCorrections } from '../calc/corrections';
import { closingDecisions } from '../calc/deadlines';
import { assessFleet } from '../calc/exposure';
import { leaseOf } from '../calc/lease';
import { readiness } from '../calc/readiness';
import { recommendFleet } from '../calc/recommend';
import type { ExtensionEffects, Robustness } from '../calc/robustness';
import type { Assumptions, Dataset, Proposal } from '../calc/types';
import { whatIf, whatIfChoices } from '../calc/whatif';
import dataset from '../data/fleet.json';
import { useDemo } from './demo';
import Shell from './screens/Shell';

// The only place the dataset is read. Everything on screen comes out of assessFleet and
// recommendFleet, recomputed from the assumptions (any override) and from the leases as the leasing
// team has corrected them (calc/corrections.ts — with no correction, the data as read). The head of
// fleet's what-if is priced against that plan without replacing it, and the robustness sweep runs
// in a worker and arrives a moment later.
const asRead = dataset as unknown as Dataset;

export default function App() {
  const { corrections } = useDemo();
  const data = useMemo(() => applyCorrections(asRead, corrections), [corrections]);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const live = useDeferredValue(assumptions);
  // The plan at rest is on the leases as read, so a row whose action a correction changes says what it was.
  const atRest = useMemo(() => recommendFleet(asRead, assessFleet(asRead, DEFAULT_ASSUMPTIONS), DEFAULT_ASSUMPTIONS), []);
  const fleet = useMemo(() => assessFleet(data, live), [data, live]);
  const plans = useMemo(() => recommendFleet(data, fleet, live), [data, fleet, live]);
  // A budget is a constraint on what to fund, not a model assumption; no limit until one is entered.
  const [budget, setBudget] = useState<number | null>(null);
  const budgetPlan = useMemo(() => fitToBudget(plans, budget ?? Infinity, data.asOf), [plans, budget, data]);
  const closing = useMemo(() => closingDecisions(plans, data.asOf), [plans, data]);
  const ready = useMemo(() => readiness(data, fleet, plans), [data, fleet, plans]);
  // The head of fleet's own changes, against today's plan; the screen stays on today's plan.
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const proposed = useDeferredValue(proposals);
  const choices = useMemo(() => whatIfChoices(data, fleet), [data, fleet]);
  const scenario = useMemo(() => (proposed.length ? whatIf(data, live, plans, proposed) : null), [data, live, plans, proposed]);
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
    // Ask again once the assumptions have been still for a moment: a dragged control should not queue a sweep per step.
    const t = setTimeout(() => {
      asked.current += 1;
      setAskedId(asked.current);
      worker.current?.postMessage({ id: asked.current, assumptions: live, corrections });
    }, 250);
    return () => clearTimeout(t);
  }, [live, corrections]);

  return (
    <Shell
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
      proposals={proposals}
      onProposals={setProposals}
      whatIf={scenario}
      leaseOf={leaseFor}
      leaseAsRead={leaseAsRead}
      readiness={ready}
      assumptions={assumptions}
      onAssumptions={setAssumptions}
    />
  );
}
