import { HowFirm } from '../components/HowFirm';
import { WhatThisAssumes } from '../components/WhatThisAssumes';
import { WhatYouCanDo } from '../components/WhatYouCanDo';
import type { ScreenProps } from './Shell';

/** Scenario planning: the head of fleet's own decisions, what the numbers assume, and what to confirm before acting. */
export default function Scenarios(props: ScreenProps) {
  const { extension, budget, onBudget, budgetPlan, fleet, choices, proposals, onProposals, whatIf, assumptions, onAssumptions, robustness, robustnessPending } = props;
  return (
    <div className="space-y-12">
      <WhatYouCanDo
        extension={extension}
        budget={budget}
        onBudget={onBudget}
        budgetPlan={budgetPlan}
        asOf={fleet.asOf}
        choices={choices}
        proposals={proposals}
        onProposals={onProposals}
        whatIf={whatIf}
      />
      <WhatThisAssumes assumptions={assumptions} onChange={onAssumptions} robustness={robustness} pending={robustnessPending} />
      <HowFirm robustness={robustness} pending={robustnessPending} />
    </div>
  );
}
