import { useDeferredValue, useMemo } from 'react';

import { draftAssignment, type AssignmentDraft } from '../../calc/assign';
import { closingDecisions } from '../../calc/deadlines';
import { assignable, decisionChoices, runScenario } from '../../calc/scenario';
import { Answer } from '../components/Answer';
import { BudgetSection } from '../components/Budget';
import { DecisionPicker, MarketRow } from '../components/Questions';
import { useDemo } from '../demo';
import type { ScreenProps } from './Shell';

/**
 * Scenario planning: the market changes as one row of fields, the aircraft decisions in one picker, and
 * the answer — what the changed figures do to the tool's advice, kept apart from your decisions, each
 * judged against today's plan (calc/scenario.ts). The full calculation is folded beneath; this year's
 * budget sits at the bottom. Nothing here changes today's plan.
 */
export default function Scenarios(
  props: ScreenProps & { onAssign: (d: AssignmentDraft) => void; focus: { tail: string; at: number } | null },
) {
  const { data, plans, budget, onBudget, budgetPlan, fleet, choices, robustness, robustnessPending, leaseOf, onAssign, focus } = props;
  const { scenario, setScenario } = useDemo();
  const shown = useDeferredValue(scenario);
  const result = useMemo(() => runScenario(data, plans, shown), [data, plans, shown]);
  // No decision is offered on an aircraft with nothing to decide: it cannot be priced fairly yet.
  const offered = useMemo(() => decisionChoices(choices, plans), [choices, plans]);
  // The tool's new advice on each aircraft it changes, drafted from the plan with the changed figures.
  const adviceDrafts = useMemo(() => {
    const out: Record<string, AssignmentDraft> = {};
    const items = closingDecisions(result.worldPlan, data.asOf).items;
    for (const c of result.advice) {
      const x = items.find((i) => i.tail === c.tail);
      const t = result.worldFleet.returning.find((r) => r.tail === c.tail);
      const l = leaseOf(c.tail);
      const p = result.worldPlan.byTail[c.tail];
      if (x && t && l && p) out[c.tail] = draftAssignment(x, p, t, l, data.asOf);
    }
    return out;
  }, [result, data, leaseOf]);
  // Each decision better than today's plan, drafted from the plan with that decision alone. A return
  // date is agreed with the lessor, not assigned.
  const decisionDrafts = useMemo(() => {
    const out: Record<number, AssignmentDraft> = {};
    result.verdicts.forEach((v, k) => {
      if (!assignable(v) || !v.closing || !v.plan || !v.fleet) return;
      const tail = v.proposal.tail;
      const t = v.fleet.returning.find((r) => r.tail === tail);
      const l = leaseOf(tail);
      const p = v.plan.byTail[tail];
      if (t && l && p) out[k] = draftAssignment(v.closing, p, t, l, data.asOf);
    });
    return out;
  }, [result, data, leaseOf]);
  return (
    <div className="space-y-12">
      <section>
        <h2 className="caps mb-2">Scenario planning</h2>
        <p className="mb-8 text-slate-500">See what a change in the market, or a decision of your own, does to your plan. The Overview always shows today's plan.</p>
        <h3 className="caps mb-3">If the market changes</h3>
        <MarketRow scenario={scenario} onScenario={setScenario} />
        <h3 className="caps mt-10 mb-3">If you decide</h3>
        <DecisionPicker scenario={scenario} onScenario={setScenario} choices={offered.open} cleared={offered.cleared} named={choices} focus={focus} />
      </section>
      <Answer
        scenario={scenario}
        result={result}
        pending={shown !== scenario}
        adviceDrafts={adviceDrafts}
        decisionDrafts={decisionDrafts}
        onAssign={onAssign}
        named={choices}
        asOf={fleet.asOf}
        robustness={robustness}
        robustnessPending={robustnessPending}
      />
      <BudgetSection budget={budget} onBudget={onBudget} plan={budgetPlan} asOf={fleet.asOf} />
    </div>
  );
}
