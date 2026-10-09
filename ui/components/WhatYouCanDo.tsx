import type { BudgetPlan } from '../../calc/budget';
import type { ExtensionEffects } from '../../calc/robustness';
import type { Proposal } from '../../calc/types';
import type { TailChoices, WhatIf as WhatIfResult } from '../../calc/whatif';
import { date, decideBy, money } from '../format';
import { WhatIf } from './WhatIf';

/**
 * What you can do: the head of fleet's own decisions, under the recommended actions and the
 * tails they rest on. A what-if of his own actions against today's plan, and this year's budget.
 */
export function WhatYouCanDo({
  extension,
  choices,
  proposals,
  onProposals,
  whatIf,
  budget,
  onBudget,
  budgetPlan,
  asOf,
}: {
  extension: ExtensionEffects | null;
  choices: TailChoices[];
  proposals: Proposal[];
  onProposals: (p: Proposal[]) => void;
  whatIf: WhatIfResult | null;
  budget: number | null;
  onBudget: (b: number | null) => void;
  budgetPlan: BudgetPlan;
  asOf: string;
}) {
  return (
    <section>
      <h2 className="caps mb-2">Your decisions</h2>
      <p className="mb-6 text-slate-500">
        Try your own actions — swap a part, send one to the shop, change a route, move a return date — and see what they change against today's plan. The plan on
        the Overview stays as it is until you act.
      </p>
      <div className="grid gap-12 lg:grid-cols-2">
        <WhatIf choices={choices} proposals={proposals} onProposals={onProposals} result={whatIf} extension={extension} />
        <Budget budget={budget} onBudget={onBudget} plan={budgetPlan} asOf={asOf} />
      </div>
    </section>
  );
}

/** This year's return-related maintenance budget: what it funds, and what it leaves out at what cost. */
function Budget({ budget, onBudget, plan, asOf }: { budget: number | null; onBudget: (b: number | null) => void; plan: BudgetPlan; asOf: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span>Maintenance budget to {date(plan.windowEnd)}</span>
        <span className="inline-flex items-center gap-1">
          $
          <input
            className="w-20 rounded-md border border-slate-200 px-2 py-1 text-right tabular-nums"
            type="number"
            min={0}
            step={0.5}
            placeholder="no limit"
            value={budget === null ? '' : budget / 1e6}
            onChange={(e) => onBudget(e.target.value === '' ? null : Math.max(0, Number(e.target.value)) * 1e6)}
          />
          M
        </span>
      </div>
      <p className="mt-2 text-label text-slate-500">
        Every recommended action needs {money(plan.needed)} in this window
        {plan.reserves > 0 && <>, net of reserves reclaimed ({money(plan.needed + plan.reserves)} gross)</>}, {money(plan.forcedSpend)} of it required.
      </p>
      {budget !== null && (
        <div className="mt-3 space-y-1">
          {plan.shortfall > 0 && (
            <p className="font-medium">The required actions alone are {money(plan.shortfall)} over this budget: nothing else can be funded.</p>
          )}
          {plan.leftOut.length === 0 ? (
            plan.shortfall === 0 && <p className="text-slate-500">Every recommended action fits.</p>
          ) : (
            <>
              <p className="text-slate-500">
                Left out, paying at handback instead — {money(plan.savingForgone)} of savings given up:
              </p>
              <ul className="space-y-0.5">
                {plan.leftOut.map((x) => (
                  <li key={x.tail}>
                    <span className="font-medium">{x.tail}</span> <span className="text-slate-500">{x.label}</span> · {money(x.spend)} · gives up{' '}
                    <span className="font-medium">{money(x.saving)}</span> ·{' '}
                    {x.closesThisYear ? (
                      <span className="font-medium">{decideBy(x.decisionDeadline!, asOf)} — inside the window, so the option is lost, not deferred</span>
                    ) : (
                      <span className="text-slate-500">can wait for next year's budget</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
