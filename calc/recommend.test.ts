// SPEC §2.7–§2.8 — the recommendation and the avoidable / unavoidable split, on the fixture
// tail (see levers.test.ts for the lever arithmetic) and on the generated fleet.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { assessFleet, assessTail } from './exposure';
import { AS_OF, aircraft, assumptions, component, conditions, lessor, spare } from './fixtures.test-helpers';
import type { LeverContext } from './levers';
import { addMonths } from './projection';
import { COST_ESTIMATE_UNCERTAINTY, costEstimateQuality } from './constants';
import type { LeverOption } from './levers';
import { actionOf, compareRecommendations, recommendFleet, recommendTail, tellApart } from './recommend';
import type { Aircraft, Component, Dataset } from './types';

const full = aircraft();
const eng1 = full.components[0]!;
const eng2 = full.components[1]!;
const tight = spare('U1', 'ESN-TIGHT', { tso: 22_000, cso: 8_000, llpMinCyclesRemaining: 12_000 });

function context(ac: Aircraft, pool: Component[] = []): LeverContext {
  const rcs = conditions(ac.tail);
  const a = assumptions();
  return { ac, lessor: lessor(), conditions: rcs, a, baseline: assessTail(ac, rcs, AS_OF, a), pool, donors: [] };
}

describe('recommendTail', () => {
  it('takes the cheapest feasible option, with the runner-up and the delta', () => {
    // ENG2 runs out at month 5, so the options are the levers applied to it. The right-sized
    // spare beats a shop visit; paying is not on the table.
    const r = recommendTail(context(full, [tight]));
    expect(r.recommended.label).toBe('Swap ENG2 for spare ESN-TIGHT');
    expect(r.runnerUp!.lever).toBe('L1');
    expect(r.delta).toBeCloseTo(r.runnerUp!.total - r.recommended.total, 3);
    expect(r.options.find((o) => o.lever === 'pay')!.feasible).toBe(false);
    expect(r.trace).toContain('ENG2 runs out of cycles at month 5.0');
  });

  it('splits avoidable from unavoidable', () => {
    const r = recommendTail(context(full, [tight]));
    expect(r.unavoidable).toBeCloseTo(r.recommended.total, 3);
    expect(r.avoidable).toBeCloseTo(r.doNothing - r.unavoidable, 3);
    // ENG2's compensation and sunk over-delivery ($2,340,000 + $3,960,000) go to the pool with it;
    // the spare's $3,375,000 of life comes in, plus removal and a night's downtime.
    expect(r.avoidable).toBeCloseTo(2_340_000 + 3_960_000 - 3_375_000 - 28_500 - 45_000, 0);
  });

  it('carries sunk over-delivery through the avoidable figure unchanged, unless a swap keeps the unit', () => {
    // Two tails alike but for ENG2's last workscope. Short-dense, so the engine is 116 FC short
    // ($208,800) and a move to mixed clears it; nothing runs out before handback. Build-for-
    // interval left 12,000 FC × $330 = $3,960,000 of avoidable LLP life; build-for-cash left none.
    // The do-nothing figures differ by exactly that — the avoidable figures not at all.
    const eng = (w: 'build-for-interval' | 'build-for-cash') => component('engine', 'ENG2', { ...eng2, tso: 20_000, cso: 7_500, lastWorkscope: w });
    const tail = (w: 'build-for-interval' | 'build-for-cash') =>
      recommendTail(context(aircraft({ routeProfile: 'short-dense', hoursPerMonth: 291, cyclesPerMonth: 151 }, [eng(w)])));
    const interval = tail('build-for-interval');
    const cash = tail('build-for-cash');
    expect(interval.doNothing - cash.doNothing).toBeCloseTo(3_960_000, 3);
    expect(interval.recommended.lever).toBe('L2');
    expect(cash.recommended.lever).toBe('L2');
    expect(interval.avoidable).toBeCloseTo(208_800, 3);
    expect(cash.avoidable).toBeCloseTo(interval.avoidable, 3);
  });

  it("decides by the recommended action's deadline", () => {
    expect(recommendTail(context(full, [tight])).decisionDeadline).toBe(addMonths(AS_OF, 5));
  });

  it('ranks lever 4 once when it lands on lever 1', () => {
    const r = recommendTail(context(full, [tight]));
    const l1 = r.options.find((o) => o.lever === 'L1')!;
    const l4 = r.options.find((o) => o.lever === 'L4')!;
    expect(l4.actionKey).toBe(l1.actionKey);
    expect(r.runnerUp!.lever).toBe('L1'); // not L4 as well
  });

  it('pays when nothing beats it, with nothing avoidable and nothing to book', () => {
    // ENG1 alone: clear of every threshold, nothing to swap, and a route change only burns life.
    const r = recommendTail(context(aircraft({}, [eng1])));
    expect(r.recommended.lever).toBe('pay');
    expect(r.avoidable).toBe(0);
    expect(r.decisionDeadline).toBeNull();
    expect(r.trace).toContain('nothing is avoidable');
  });

  it('falls back to the plain ranking when no lever can keep a timed-out component flying', () => {
    // 300 FC left: out at month 3, before the first slot, and no spare to fit.
    const early = component('engine', 'ENG2', { ...eng2, cso: 9_700 });
    const r = recommendTail(context(aircraft({}, [early])));
    expect(r.recommended.lever).toBe('pay');
    expect(r.recommended.feasible).toBe(true);
    expect(r.trace).toContain('no lever can keep it flying');
    expect(r.recommended.trace).toContain('Caution');
  });

  it('never recommends an infeasible option', () => {
    for (const ac of [full, aircraft({}, [eng1]), aircraft({}, [eng2])]) expect(recommendTail(context(ac, [tight])).recommended.feasible).toBe(true);
  });
});

describe('recommendFleet', () => {
  it('puts a spare on one aircraft only', () => {
    // Two identical tails, one right-sized spare. The first takes it; the second is left with
    // the shop visit, because its ENG2 still has to be dealt with.
    const a = aircraft({ tail: 'T-A' });
    const b = aircraft({ tail: 'T-B' });
    const data = { aircraft: [a, b], lessors: [lessor()], pool: [tight], returnConditions: [...conditions('T-A'), ...conditions('T-B')] };
    const r = recommendFleet(data, assessFleet({ asOf: AS_OF, ...data }), assumptions());
    expect(r.plans.filter((p) => p.label.includes('ESN-TIGHT'))).toHaveLength(1);
    expect(r.plans.map((p) => p.recommendation.recommended.lever).sort()).toEqual(['L1', 'L3']);
  });

  it('adds up', () => {
    const a = aircraft({ tail: 'T-A' });
    const b = aircraft({ tail: 'T-B' });
    const data = { aircraft: [a, b], lessors: [lessor()], pool: [tight], returnConditions: [...conditions('T-A'), ...conditions('T-B')] };
    const r = recommendFleet(data, assessFleet({ asOf: AS_OF, ...data }), assumptions());
    expect(r.totals.after).toBeCloseTo(r.plans.reduce((s, p) => s + p.after, 0), 3);
    expect(r.totals.avoidable).toBeCloseTo(r.totals.doNothing - r.totals.after, 3);
    expect(r.totals.acting + r.totals.forced + r.totals.paying + r.totals.donors).toBe(2);
    // Both fixture tails have an ENG2 that runs out at month 5: both are forced, neither chose.
    expect(r.totals.forced).toBe(2);
  });
});

describe('the generated fleet', () => {
  const data = dataset as unknown as Dataset;
  const fleet = assessFleet(data);
  const r = recommendFleet(data, fleet);

  it('plans every returning tail', () => {
    expect(r.plans.map((p) => p.tail)).toEqual(fleet.returning.map((t) => t.tail));
    for (const p of r.plans) expect(p.recommendation.recommended.feasible).toBe(true);
  });

  it('saves money overall, and never recommends more than paying where paying is possible', () => {
    expect(r.totals.after).toBeLessThan(r.totals.doNothing);
    for (const p of r.plans)
      if (p.role === 'own' && p.recommendation.options.find((o) => o.lever === 'pay')!.feasible) expect(p.avoidable).toBeGreaterThanOrEqual(-1e-6);
  });

  it('uses each spare and each tail once', () => {
    const spares = r.plans.flatMap((p) => (p.role === 'own' && p.recommendation.recommended.move?.incoming.from === 'pool' ? [p.recommendation.recommended.move.incoming.id] : []));
    expect(new Set(spares).size).toBe(spares.length);
    const donors = r.plans.flatMap((p) => (p.role === 'own' && p.recommendation.recommended.move?.donor ? [p.recommendation.recommended.move.donor.tail] : []));
    for (const d of donors) expect(r.byTail[d]!.role).toBe('donor');
  });

  it('deals with every engine that runs out before handback, where a lever can', () => {
    for (const p of r.plans) if (p.recommendation.trace.includes('so the options are the ones that keep it flying')) expect(p.recommendation.recommended.lever).not.toBe('pay');
  });

  it('prints the headline arithmetic', () => {
    console.log('\n' + r.trace + '\n');
    expect(r.trace).toContain('avoidable');
  });
});

describe('compareRecommendations — SPEC §3.4, which tails change what they are told to do', () => {
  const data = dataset as unknown as Dataset;
  const run = (over: Partial<ReturnType<typeof assumptions>> = {}) => {
    const a = assumptions(over);
    return recommendFleet(data, assessFleet(data, a), a);
  };
  const atRest = run();

  it('finds nothing to report against itself', () => {
    expect(compareRecommendations(atRest, atRest).changed).toEqual([]);
    expect(compareRecommendations(atRest, atRest).trace).toContain('the decisions do not');
  });

  it('reports the tails whose action changes when a control moves', () => {
    // Ten per cent more flying opens a shortfall on the two reserve-lease widebodies, and their
    // reserves pay for the visit: paying gives way to doing the work.
    const c = compareRecommendations(atRest, run({ utilisationMultiplier: 1.1 }));
    expect(c.changed.map((x) => x.tail).sort()).toEqual(['A6-MVC', 'A6-MXM']);
    for (const x of c.changed) expect(x).toMatchObject({ from: 'Pay at handback', to: expect.stringContaining('Do the work') });
  });

  it('does not count a different spare for the same swap as a change', () => {
    // Ten per cent less flying reshuffles which pool engine 9H-KVJ and 9H-ZUU take; only 9H-MMC
    // changes what it does, from a swap to paying.
    const c = compareRecommendations(atRest, run({ utilisationMultiplier: 0.9 }));
    expect(c.changed.map((x) => x.tail)).toEqual(['9H-MMC']);
  });

  it('names the action, not the month: the same visit a month later is the same decision', () => {
    const plan = atRest.byTail['A6-DLL']!;
    expect(actionOf(plan)).toBe('visit:ENG1:build-for-cash');
  });
});

describe('the money in play and the forced cases', () => {
  const data = dataset as unknown as Dataset;
  const r = recommendFleet(data, assessFleet(data));

  it('splits every avoidable figure into cash and life, and the totals likewise', () => {
    for (const p of r.plans) expect(p.avoidable).toBeCloseTo(p.avoidableCash + p.avoidableLife, 3);
    expect(r.totals.avoidable).toBeCloseTo(r.totals.avoidableCash + r.totals.avoidableLife, 3);
    expect(r.totals.doNothing).toBeCloseTo(r.totals.doNothingCash + r.totals.doNothingLife, 3);
    expect(r.totals.avoidableCashShare).toBeCloseTo(r.totals.avoidableCash / r.totals.doNothingCash, 9);
  });

  it('moves no life where the units stay where they are: sunk over-delivery cancels', () => {
    for (const p of r.plans) if (!p.recommendation.recommended.move) expect(p.avoidableLife).toBeCloseTo(0, 3);
  });

  it('labels the tails that cannot reach handback as forced, not recommended', () => {
    // A6-DLL ENG1, 9H-KVJ ENG2 and 9H-ZUU ENG2 each run out before handback.
    expect(r.plans.filter((p) => p.forced).map((p) => p.tail).sort()).toEqual(['9H-KVJ', '9H-ZUU', 'A6-DLL']);
    for (const p of r.plans.filter((x) => x.forced)) {
      expect(p.forced).toContain('doing nothing is not an option');
      expect(p.recommendation.options.find((o) => o.lever === 'pay')!.feasible).toBe(false);
    }
    expect(r.byTail['9H-ZUU']!.trace).toContain('not choosing the dearer option');
  });
});

describe('how good the cost estimates are — ASSUMPTIONS §0', () => {
  const q = costEstimateQuality();

  it('derives ±10.1% from escalation ranges and appraiser spreads, weighted by share of cost', () => {
    const pr = q.types.find((t) => t.id === 'enginePR')!;
    // Engine restoration: 4.5–6.5%/yr over eight years is ×1.422–1.655 around the ×1.55 used: ±7.5%;
    // the 2018 appraiser ranges add ±3.8%; together ±8.4%.
    expect(pr.escalation).toBeCloseTo((1.065 ** 8 - 1.045 ** 8) / 2 / 1.55, 9);
    expect(pr.combined).toBeCloseTo(Math.hypot(pr.escalation, pr.appraiser), 9);
    // LLPs carry the most: 5–8%/yr compounds to ±11.7%, and they are over half of the cost.
    expect(q.types.find((t) => t.id === 'engineLLP')!.combined).toBeCloseTo(0.1167, 3);
    expect(COST_ESTIMATE_UNCERTAINTY).toBeCloseTo(0.1014, 3);
  });

  it("flags that §0's airframe factor sits above its own published escalation range", () => {
    expect(q.types.find((t) => t.id === 'airframe')!.factorInsideRange).toBe(false);
    expect(q.types.filter((t) => t.id !== 'airframe').every((t) => t.factorInsideRange)).toBe(true);
  });
});

describe('tellApart — one rule, in money, for whether there is a recommendation', () => {
  const option = (lever: LeverOption['lever'], over: Partial<LeverOption>): LeverOption => ({
    lever, label: lever, cost: 0, downtimeDays: 0, downtimeCost: 0, newExposure: 0, newCompensation: 0, spend: 0, spendDate: null,
    total: 0, saving: 0, feasible: true, deadline: null, trace: '', actionKey: lever, ...over,
  });

  it('stands when the advantage is larger than ±10.1% of the money on which the two options differ', () => {
    // Pay owes $1M of compensation; the work spends $0.5M and owes nothing: they differ on $1.5M,
    // so the advantage of $0.5M must beat ±$152K. It does.
    const work = option('L1', { spend: 500_000, cost: 500_000, total: 500_000 });
    const pay = option('pay', { newCompensation: 1_000_000, newExposure: 1_000_000, total: 1_000_000 });
    const c = tellApart(work, pay);
    expect(c.differing).toBeCloseTo(1_500_000, 3);
    expect(c.uncertainty).toBeCloseTo(1_500_000 * COST_ESTIMATE_UNCERTAINTY, 3);
    expect(c.stands).toBe(true);
  });

  it('does not stand when the advantage is inside that uncertainty', () => {
    // The work spends $0.95M against $1M of compensation: $50K ahead, inside ±$198K.
    const work = option('L1', { spend: 950_000, cost: 950_000, total: 950_000 });
    const pay = option('pay', { newCompensation: 1_000_000, newExposure: 1_000_000, total: 1_000_000 });
    const c = tellApart(work, pay);
    expect(c.stands).toBe(false);
    expect(c.why).toContain('cannot be told apart');
  });

  it('ignores money both options carry alike: it moves both and cancels', () => {
    // $8M of sunk over-delivery in both: it adds nothing to the uncertainty of the $0.5M advantage.
    const work = option('L1', { spend: 500_000, cost: 500_000, newExposure: 8_000_000, total: 8_500_000 });
    const pay = option('pay', { newCompensation: 1_000_000, newExposure: 9_000_000, total: 9_000_000 });
    expect(tellApart(work, pay).differing).toBeCloseTo(1_500_000, 3);
  });

  it('stands when there is no other option', () => {
    expect(tellApart(option('L3', {}), null).stands).toBe(true);
  });
});

describe('the rule on the generated fleet', () => {
  const data = dataset as unknown as Dataset;
  const r = recommendFleet(data, assessFleet(data));

  it('gives no recommendation where the options cannot be told apart, and pays', () => {
    // A6-YTM, 9H-RYM and 9H-PJS: the only alternative is a route change that comes to the same money.
    for (const t of ['A6-YTM', '9H-RYM', '9H-PJS']) {
      const p = r.byTail[t]!;
      expect(p.recommendation.call.stands, t).toBe(false);
      expect(p.label).toBe('No recommendation — pay at handback');
      expect(p.recommendation.recommended.lever).toBe('pay');
    }
    expect(r.totals.undecided).toBe(3);
  });

  it('lets every recommendation with a real alternative stand, by a wide margin', () => {
    for (const t of ['9H-KVJ', 'A6-MXM', 'A6-GPZ', '9H-MMC', 'A6-MVC']) {
      const c = r.byTail[t]!.recommendation.call;
      expect(c.stands, t).toBe(true);
      expect(c.advantage, t).toBeGreaterThan(c.uncertainty * 1.5);
    }
  });
});
