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
    <section className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <h2 className="mb-2 text-[11px] font-medium tracking-wide text-slate-500 uppercase">Scenario planning</h2>
      <div className="grid gap-6 lg:grid-cols-2">
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
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
        <span>Maintenance budget to {date(plan.windowEnd)}</span>
        <span className="inline-flex items-center gap-1">
          $
          <input
            className="w-20 rounded border border-slate-300 px-1.5 py-0.5 text-right tabular-nums"
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
      <p className="mt-1 text-xs text-slate-500">
        Every recommended action needs {money(plan.needed)} in this window, {money(plan.forcedSpend)} of it required.
      </p>
      {budget !== null && (
        <div className="mt-1 text-[13px]">
          {plan.shortfall > 0 && (
            <p className="font-medium text-red-800">The required actions alone are {money(plan.shortfall)} over this budget: nothing else can be funded.</p>
          )}
          {plan.leftOut.length === 0 ? (
            plan.shortfall === 0 && <p className="text-slate-600">Every recommended action fits.</p>
          ) : (
            <>
              <p className="text-slate-600">
                Left out, paying at handback instead — {money(plan.savingForgone)} of savings given up:
              </p>
              <ul className="space-y-0.5">
                {plan.leftOut.map((x) => (
                  <li key={x.tail}>
                    <span className="font-medium">{x.tail}</span> <span className="text-slate-500">{x.label}</span> · {money(x.spend)} · gives up{' '}
                    <span className="font-medium">{money(x.saving)}</span> ·{' '}
                    {x.closesThisYear ? (
                      <span className="text-red-800">{decideBy(x.decisionDeadline!, asOf)} — inside the window, so the option is lost, not deferred</span>
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
