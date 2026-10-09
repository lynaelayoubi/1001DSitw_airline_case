import { useDeferredValue, useMemo } from 'react';

import { draftAssignment, type AssignmentDraft } from '../../calc/assign';
import { closingDecisions } from '../../calc/deadlines';
import { assignable, decisionChoices, runScenario } from '../../calc/scenario';
import { Answer, Calculation } from '../components/Answer';
import { BudgetSection } from '../components/Budget';
import { DecisionBuilder, DecisionList, MarketPanel } from '../components/Questions';
import { useDemo } from '../demo';
import type { ScreenProps } from './Shell';

/**
 * Scenario planning, in two columns on a wide screen: your scenario on the left — the market, a decision
 * to add, your decisions each with its verdict — and on the right, in view while you work, what it does:
 * the answer and the tool's advice (calc/scenario.ts). The calculation folds beneath both; this year's
 * budget closes the page. Nothing here changes today's plan.
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
  // Each decision better than today's plan, drafted from the plan with that decision alone.
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
      <header>
        <h2 className="caps mb-2">Scenario planning</h2>
        <p className="text-slate-500">See what a change in the market, or a decision of your own, does to your plan. The Overview always shows today's plan.</p>
      </header>
      <div className="grid gap-x-16 gap-y-12 lg:grid-cols-12 lg:items-start">
        <div className="space-y-10 lg:col-span-5">
          <MarketPanel scenario={scenario} onScenario={setScenario} />
          <DecisionBuilder scenario={scenario} onScenario={setScenario} choices={offered.open} cleared={offered.cleared} focus={focus} />
          <DecisionList
            scenario={scenario}
            onScenario={setScenario}
            priced={shown.decisions}
            verdicts={result.verdicts}
            drafts={decisionDrafts}
            onAssign={onAssign}
            named={choices}
            asOf={fleet.asOf}
          />
        </div>
        <aside className="lg:sticky lg:top-6 lg:col-span-7 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <Answer scenario={scenario} result={result} pending={shown !== scenario} adviceDrafts={adviceDrafts} onAssign={onAssign} asOf={fleet.asOf} />
        </aside>
      </div>
      <Calculation scenario={scenario} result={result} robustness={robustness} robustnessPending={robustnessPending} />
      <BudgetSection budget={budget} onBudget={onBudget} plan={budgetPlan} asOf={fleet.asOf} />
    </div>
  );
}
