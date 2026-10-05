// Fitting this year's recommended actions to a maintenance budget: forced first, then the
// combination of optional actions that saves the most within what is left.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { chooseWithinBudget, fitToBudget } from './budget';
import { assessFleet } from './exposure';
import { addMonths } from './projection';
import { recommendFleet } from './recommend';
import type { Dataset } from './types';

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

  it('funds the forced removals first, then the optional action that saves most', () => {
    // Room for one $28,500 swap after the forced ones: A6-GPZ's saves $5.68M, 9H-MMC's $1.31M.
    const r = fitToBudget(plans, open.forcedSpend + 28_500, data.asOf);
    expect(r.funded.filter((x) => !x.forced).map((x) => x.tail)).toEqual(['A6-GPZ']);
    expect(r.leftOut.map((x) => x.tail)).toEqual(['9H-MMC']);
    expect(r.savingForgone).toBeCloseTo(plans.byTail['9H-MMC']!.recommendation.recommended.saving, 3);
  });

  it("says whether a left-out tail's decision closes inside the budget year", () => {
    const r = fitToBudget(plans, 0, data.asOf);
    const mmc = r.leftOut.find((x) => x.tail === '9H-MMC')!;
    const gpz = r.leftOut.find((x) => x.tail === 'A6-GPZ')!;
    expect(mmc.closesThisYear).toBe(true); // decide by 15 Aug 2027
    expect(gpz.closesThisYear).toBe(false); // decide by 3 Jan 2028: next year's budget can take it
    expect(r.trace).toContain('loses the option');
  });

  it('flags a budget the forced removals alone exceed, and funds nothing else', () => {
    const r = fitToBudget(plans, 1_000_000, data.asOf);
    expect(r.shortfall).toBeCloseTo(open.forcedSpend - 1_000_000, 3);
    expect(r.funded.every((x) => x.forced)).toBe(true);
  });
});
