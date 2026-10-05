// Fitting the recommendations to a budget for this year's return-related maintenance. Pure:
// the fleet's recommendations and a budget in, the actions it funds and the ones it leaves out.
//
// What counts against the budget is each recommended action's maintenance cash (LeverOption.spend:
// a shop visit less reserves reclaimed, removal and installation) when its work falls inside the
// budget year — the next BUDGET_WINDOW_MONTHS from the data's date. Compensation is not in it:
// that is paid at handback, out of the provision carved at lease signing.
//
// Forced actions come first: a component that runs out before handback has to come off, so it is
// not a choice the budget can make. The optional ones are then chosen to save the most within what
// is left — every combination is tried, which is exact and cheap for ten tails. A left-out tail
// falls back to paying at handback, and what that costs is the saving it gives up. A spare freed by
// a left-out swap is not offered to another tail.

import { BUDGET_WINDOW_MONTHS } from './constants';
import { usd } from './format';
import { addMonths } from './projection';
import type { FleetRecommendation, TailPlan } from './recommend';
import type { ISODate } from './types';

export interface BudgetItem {
  tail: string;
  label: string;
  spend: number;
  /** What funding it saves against paying at handback, across every tail it touches. */
  saving: number;
}

/** The subset of items with the largest total saving whose spend fits; ties go to the cheaper set. */
export function chooseWithinBudget(items: BudgetItem[], budget: number): BudgetItem[] {
  let best: BudgetItem[] = [];
  let bestSaving = 0;
  let bestSpend = 0;
  for (let mask = 0; mask < 1 << items.length; mask++) {
    let spend = 0;
    let saving = 0;
    for (let i = 0; i < items.length; i++)
      if (mask & (1 << i)) {
        spend += items[i]!.spend;
        saving += items[i]!.saving;
      }
    if (spend > budget + 1e-6) continue;
    if (saving > bestSaving + 1e-6 || (Math.abs(saving - bestSaving) <= 1e-6 && spend < bestSpend)) {
      best = items.filter((_, i) => mask & (1 << i));
      bestSaving = saving;
      bestSpend = spend;
    }
  }
  return best;
}

export interface LeftOut extends BudgetItem {
  decisionDeadline: ISODate | null;
  /** The decision closes inside the budget year: leaving it out loses the option, it does not defer it. */
  closesThisYear: boolean;
}

export interface BudgetPlan {
  budget: number;
  windowEnd: ISODate;
  /** This year's spend on every recommended action, forced and chosen. */
  needed: number;
  forcedSpend: number;
  /** Forced spend the budget does not cover; the rest is then left out. */
  shortfall: number;
  funded: (BudgetItem & { forced: boolean })[];
  leftOut: LeftOut[];
  /** Actions whose spend falls after the budget year: next year's money. */
  nextYear: BudgetItem[];
  savingFunded: number;
  savingForgone: number;
  trace: string;
}

const savingOf = (p: TailPlan) => p.recommendation.recommended.saving;

export function fitToBudget(plans: FleetRecommendation, budget: number, asOf: ISODate): BudgetPlan {
  const windowEnd = addMonths(asOf, BUDGET_WINDOW_MONTHS);
  const acting = plans.plans.filter((p) => p.role === 'own' && p.recommendation.recommended.lever !== 'pay');
  const item = (p: TailPlan): BudgetItem => ({ tail: p.tail, label: p.label, spend: p.spend, saving: savingOf(p) });
  const thisYear = acting.filter((p) => p.spendDate !== null && p.spendDate <= windowEnd);
  const nextYear = acting.filter((p) => p.spendDate !== null && p.spendDate > windowEnd).map(item);
  const free = acting.filter((p) => p.spendDate === null).map(item); // a route change spends nothing

  const forced = thisYear.filter((p) => p.forced).map(item);
  const optional = thisYear.filter((p) => !p.forced).map(item);
  const forcedSpend = forced.reduce((s, x) => s + x.spend, 0);
  const shortfall = Math.max(0, forcedSpend - budget);
  const chosen = shortfall > 0 ? [] : chooseWithinBudget(optional, budget - forcedSpend);
  const funded = [...forced.map((x) => ({ ...x, forced: true })), ...[...chosen, ...free].map((x) => ({ ...x, forced: false }))];
  const leftOut = optional
    .filter((x) => !chosen.includes(x))
    .map((x): LeftOut => {
      const deadline = plans.byTail[x.tail]!.decisionDeadline;
      return { ...x, decisionDeadline: deadline, closesThisYear: deadline !== null && deadline <= windowEnd };
    });
  const needed = thisYear.reduce((s, p) => s + p.spend, 0);
  const savingFunded = funded.filter((x) => !x.forced).reduce((s, x) => s + x.saving, 0);
  const savingForgone = leftOut.reduce((s, x) => s + x.saving, 0);

  const trace =
    `Budget year: ${asOf} to ${windowEnd}. Every recommended action needs ${usd(needed)} of maintenance cash in it ` +
    `(${usd(forcedSpend)} forced, the rest by choice); spend counts when the work happens — a shop visit in its induction month, a swap now. ` +
    `Compensation is not in it: that is paid at handback, from the provision.\n` +
    (shortfall > 0
      ? `The ${usd(budget)} budget does not cover the forced removals: ${usd(shortfall)} short, so nothing else is funded.\n`
      : `Forced first (${usd(forcedSpend)}), then the optional actions that save the most within the ${usd(budget - forcedSpend)} left — every combination tried.\n`) +
    funded.map((x) => `Funded: ${x.tail} ${x.label}, ${usd(x.spend)}${x.forced ? ' (forced)' : `, saves ${usd(x.saving)}`}`).join('\n') +
    (leftOut.length
      ? `\n` +
        leftOut
          .map(
            (x) =>
              `Left out: ${x.tail} ${x.label}, ${usd(x.spend)} — pays at handback instead, giving up ${usd(x.saving)}; ` +
              (x.closesThisYear ? `decide by ${x.decisionDeadline}, inside the budget year, so leaving it out loses the option` : `the decision can wait for next year's budget`),
          )
          .join('\n')
      : '') +
    (nextYear.length ? `\nNext year's money: ${nextYear.map((x) => `${x.tail} ${x.label}, ${usd(x.spend)}`).join('; ')}.` : '') +
    `\nA spare freed by a left-out swap is not offered to another tail.`;

  return { budget, windowEnd, needed, forcedSpend, shortfall, funded, leftOut, nextYear, savingFunded, savingForgone, trace };
}
