// Fitting this year's recommended actions to a maintenance budget: forced first, then the
// combination of optional actions that saves the most within what is left.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { chooseWithinBudget, fitToBudget } from './budget';
import { assessFleet } from './exposure';
import { addMonths } from './projection';
import { DEFAULT_ASSUMPTIONS } from './constants';
import { recommendFleet } from './recommend';
import type { Dataset } from './types';
import { whatIf } from './whatif';

describe('chooseWithinBudget', () => {
  const A = { tail: 'A', label: 'a', spend: 5, saving: 10 };
  const B = { tail: 'B', label: 'b', spend: 4, saving: 7 };
  const C = { tail: 'C', label: 'c', spend: 3, saving: 6 };

  it('takes the combination that saves most, not the biggest single saving', () => {
    // Budget 7: A alone saves 10, B and C together save 13.
    expect(chooseWithinBudget([A, B, C], 7).map((x) => x.tail)).toEqual(['B', 'C']);
    // Budget 9: A and B (17) beat A and C (16).
    expect(chooseWithinBudget([A, B, C], 9).map((x) => x.tail)).toEqual(['A', 'B']);
  });

  it('funds nothing it cannot afford, and everything it can', () => {
    expect(chooseWithinBudget([A, B, C], 2)).toEqual([]);
    expect(chooseWithinBudget([A, B, C], 12)).toHaveLength(3);
  });
});

describe('fitToBudget on the generated fleet', () => {
  const data = dataset as unknown as Dataset;
  const plans = recommendFleet(data, assessFleet(data));
  const open = fitToBudget(plans, Infinity, data.asOf);

  it('counts the maintenance cash of every recommended action in the year, forced and chosen, and no compensation', () => {
    const acting = plans.plans.filter((p) => p.role === 'own' && p.recommendation.recommended.lever !== 'pay');
    expect(open.needed).toBeCloseTo(acting.reduce((s, p) => s + p.spend, 0), 3);
    expect(open.windowEnd).toBe(addMonths(data.asOf, 12));
    expect(open.leftOut).toEqual([]);
    // A6-DLL's forced ENG1 shop visit is nearly all of it.
    expect(open.funded.find((x) => x.tail === 'A6-DLL')!.forced).toBe(true);
    expect(open.forcedSpend / open.needed).toBeGreaterThan(0.99);
  });

  it('on this fleet, needs no cash for anything chosen: the one chosen action is a route change', () => {
    // The lease's replacement test (12.2) refuses the swaps that used to compete for the budget;
    // A6-GPZ's route change spends nothing, so any budget funds it.
    const r = fitToBudget(plans, open.forcedSpend, data.asOf);
    expect(r.funded.filter((x) => !x.forced).map((x) => [x.tail, x.spend])).toEqual([['A6-GPZ', 0]]);
    expect(r.leftOut).toEqual([]);
  });

  it("says whether a left-out tail's decision closes inside the budget year", () => {
    // On a what-if in which A6-YTM swaps ENG1 for ESN-6513: a budget that covers only the forced
    // removals leaves the swap out, and its decision closes inside the year.
    const spare = data.pool.find((u) => u.serial === 'ESN-6513')!.id;
    const w = whatIf(data, DEFAULT_ASSUMPTIONS, plans, [{ kind: 'swap', tail: 'A6-YTM', position: 'ENG1', unit: spare }]);
    const r = fitToBudget(w.scenario, open.forcedSpend, data.asOf);
    const ytm = r.leftOut.find((x) => x.tail === 'A6-YTM')!;
    expect(ytm.closesThisYear).toBe(ytm.decisionDeadline! <= r.windowEnd);
    expect(ytm.closesThisYear).toBe(true);
    expect(r.trace).toContain('loses the option');
  });

  it('flags a budget the forced removals alone exceed, and funds nothing else that costs cash', () => {
    const r = fitToBudget(plans, 1_000_000, data.asOf);
    expect(r.shortfall).toBeCloseTo(open.forcedSpend - 1_000_000, 3);
    expect(r.funded.filter((x) => !x.forced).every((x) => x.spend === 0)).toBe(true);
  });
});
