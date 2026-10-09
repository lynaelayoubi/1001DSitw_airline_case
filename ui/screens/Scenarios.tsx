import { useDeferredValue, useMemo } from 'react';

import { decisionChoices, runScenario } from '../../calc/scenario';
import { BudgetSection } from '../components/Budget';
import { Evidence } from '../components/Evidence';
import { HowFirm } from '../components/HowFirm';
import { ScenarioBuilder } from '../components/ScenarioBuilder';
import { useDemo } from '../demo';
import type { ScreenProps } from './Shell';

/**
 * Scenarios: one builder that mixes changes in the world with the head of fleet's decisions, priced
 * against today's plan (calc/scenario.ts); the evidence behind each assumption, folded; what to
 * confirm before acting; and this year's budget. Nothing here changes today's plan.
 */
export default function Scenarios(props: ScreenProps) {
  const { data, plans, extension, budget, onBudget, budgetPlan, fleet, choices, robustness, robustnessPending } = props;
  const { scenario, setScenario } = useDemo();
  const shown = useDeferredValue(scenario);
  const result = useMemo(() => runScenario(data, plans, shown), [data, plans, shown]);
  // No decision is offered on an aircraft with nothing to decide: it cannot be priced fairly yet.
  const offered = useMemo(() => decisionChoices(choices, plans), [choices, plans]);
  return (
    <div className="space-y-12">
      <ScenarioBuilder
        scenario={scenario}
        onScenario={setScenario}
        result={result}
        pending={shown !== scenario}
        choices={offered.open}
        cleared={offered.cleared}
        extension={extension}
      />
      <Evidence robustness={robustness} pending={robustnessPending} />
      <HowFirm robustness={robustness} pending={robustnessPending} />
      <BudgetSection budget={budget} onBudget={onBudget} plan={budgetPlan} asOf={fleet.asOf} />
    </div>
  );
}
