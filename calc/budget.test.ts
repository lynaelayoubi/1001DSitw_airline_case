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
    // All of it is forced: reserves pay for A6-MVC's and A6-YTM's shop visits, leaving their removal and
    // installation, and 9H-ZUU's swap.
    expect(open.forcedSpend).toBeCloseTo(open.needed, 3);
    expect(open.funded.filter((x) => x.forced && x.spend > 0).map((x) => x.tail).sort()).toEqual(['9H-ZUU', 'A6-MVC', 'A6-YTM']);
  });

  it('says what reserves pay: the work is net of them, and its gross cost is beside it', () => {
    // A6-MVC's and A6-YTM's shop visits both fall inside the year — A6-YTM's inducted 3 Sep 2027, A6-MVC's
    // on 3 Oct 2027, the year's last day — and reserves pay all but their removal and installation.
    const ytm = plans.byTail['A6-YTM']!;
    expect(ytm.spendDate! <= open.windowEnd).toBe(true);
    expect(ytm.spendDate).toBe('2027-09-03');
    expect(plans.byTail['A6-MVC']!.spendDate).toBe(open.windowEnd);
    expect(open.reserves).toBeCloseTo(ytm.reservesReclaimed + plans.byTail['A6-MVC']!.reservesReclaimed, 3);
    expect(open.reserves / 1e6).toBeCloseTo(16.97, 2);
    expect((open.needed + open.reserves) / 1e6).toBeCloseTo(17.12, 2);
    expect(open.trace).toContain('net of');
  });

  it('on this fleet, needs no cash for anything chosen: the one chosen action is a route change', () => {
    // A6-GPZ's route change spends nothing, so any budget funds it; 9H-KVJ's, which keeps its APU
    // flying, is forced, and stays labelled so though it costs nothing.
    const r = fitToBudget(plans, open.forcedSpend, data.asOf);
    expect(r.funded.filter((x) => !x.forced).map((x) => [x.tail, x.spend])).toEqual([['A6-GPZ', 0]]);
    expect(r.funded.find((x) => x.tail === '9H-KVJ')).toMatchObject({ spend: 0, forced: true });
    expect(r.leftOut).toEqual([]);
  });

  it("says whether a left-out tail's decision closes inside the budget year", () => {
    // On a what-if in which 9H-MMC swaps ENG1 for ESN-6508: a budget that covers only the forced
    // removals leaves the swap out, and its decision closes inside the year.
    const spare = data.pool.find((u) => u.serial === 'ESN-6508')!.id;
    const w = whatIf(data, DEFAULT_ASSUMPTIONS, plans, [{ kind: 'swap', tail: '9H-MMC', position: 'ENG1', unit: spare }]);
    const r = fitToBudget(w.scenario, open.forcedSpend, data.asOf);
    const mmc = r.leftOut.find((x) => x.tail === '9H-MMC')!;
    expect(mmc.closesThisYear).toBe(mmc.decisionDeadline! <= r.windowEnd);
    expect(mmc.closesThisYear).toBe(true);
    expect(r.trace).toContain('loses the option');
  });

  it('flags a budget the forced removals alone exceed, and funds nothing else that costs cash', () => {
    const r = fitToBudget(plans, open.forcedSpend / 2, data.asOf);
    expect(r.shortfall).toBeCloseTo(open.forcedSpend / 2, 3);
    expect(r.funded.filter((x) => !x.forced).every((x) => x.spend === 0)).toBe(true);
  });
});
