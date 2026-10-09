import { useDeferredValue, useMemo } from 'react';

import { draftAssignment, type AssignmentDraft } from '../../calc/assign';
import { closingDecisions } from '../../calc/deadlines';
import { decisionChoices, runScenario } from '../../calc/scenario';
import { Answer } from '../components/Answer';
import { BudgetSection } from '../components/Budget';
import { Questions } from '../components/Questions';
import { useDemo } from '../demo';
import type { ScreenProps } from './Shell';

/**
 * What if: one question, one answer, one action. The head of fleet asks plain-English questions —
 * costs, flying, reserves, a day on the ground, a shop visit, a swap, a return date, a route — and
 * the answer says what the plan costs and which recommendations change, each ready to assign
 * (calc/scenario.ts). The full calculation is folded beneath; this year's budget sits at the bottom.
 * Nothing here changes today's plan.
 */
export default function Scenarios(props: ScreenProps & { onAssign: (d: AssignmentDraft) => void }) {
  const { data, plans, budget, onBudget, budgetPlan, fleet, choices, robustness, robustnessPending, leaseOf, onAssign } = props;
  const { scenario, setScenario } = useDemo();
  const shown = useDeferredValue(scenario);
  const result = useMemo(() => runScenario(data, plans, shown), [data, plans, shown]);
  // No question is offered about an aircraft with nothing to decide: it cannot be priced fairly yet.
  const offered = useMemo(() => decisionChoices(choices, plans), [choices, plans]);
  // The new action on each aircraft that changes, drafted for assigning as on the Overview.
  const drafts = useMemo(() => {
    const out: Record<string, AssignmentDraft> = {};
    const items = closingDecisions(result.scenarioPlan, data.asOf).items;
    for (const c of result.changed) {
      const x = items.find((i) => i.tail === c.tail);
      const t = result.scenarioFleet.returning.find((r) => r.tail === c.tail);
      const l = leaseOf(c.tail);
      const p = result.scenarioPlan.byTail[c.tail];
      if (x && t && l && p) out[c.tail] = draftAssignment(x, p, t, l, data.asOf);
    }
    return out;
  }, [result, data, leaseOf]);
  return (
    <div className="space-y-12">
      <section>
        <h2 className="caps mb-2">What if</h2>
        <p className="mb-6 text-slate-500">Ask what would happen, and see what it does to your plan. The Overview always shows today's plan.</p>
        <Questions scenario={scenario} onScenario={setScenario} choices={offered.open} cleared={offered.cleared} named={choices} />
      </section>
      <Answer
        scenario={scenario}
        result={result}
        pending={shown !== scenario}
        drafts={drafts}
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
