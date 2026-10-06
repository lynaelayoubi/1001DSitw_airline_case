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
// Right-sized and permitted: no less life than ENG2 on any clock clause 12.2 names (19,500 LLP FC, level with ENG2).
const snug = spare('U1', 'ESN-SNUG', { tso: 22_000, cso: 8_000, llpMinCyclesRemaining: 19_500 });
const less90 = (d: string) => new Date(Date.parse(d + 'T00:00:00Z') - 90 * 86_400_000).toISOString().slice(0, 10);

function context(ac: Aircraft, pool: Component[] = []): LeverContext {
  const rcs = conditions(ac.tail);
  const a = assumptions();
  return { ac, lessor: lessor(), conditions: rcs, a, baseline: assessTail(ac, rcs, AS_OF, a), pool, donors: [] };
}

describe('recommendTail', () => {
  it('takes the cheapest feasible option, with the runner-up and the delta', () => {
    // ENG2 runs out at month 5, so the options are the levers applied to it. The right-sized
    // spare beats a shop visit; paying is not on the table.
    const r = recommendTail(context(full, [snug]));
    expect(r.recommended.label).toBe('Swap ENG2 for spare ESN-SNUG');
    expect(r.runnerUp!.lever).toBe('L1');
    expect(r.delta).toBeCloseTo(r.runnerUp!.total - r.recommended.total, 3);
    expect(r.options.find((o) => o.lever === 'pay')!.feasible).toBe(false);
    expect(r.trace).toContain('ENG2 runs out of cycles at month 5.0');
  });

  it('splits avoidable from unavoidable, against acting late on a forced tail', () => {
    const r = recommendTail(context(full, [snug]));
    expect(r.unavoidable).toBeCloseTo(r.recommended.total, 3);
    expect(r.avoidable).toBeCloseTo(r.doNothing - r.unavoidable, 3);
    // ENG2 runs out at month 5, so doing nothing is acting late: the same swap, the day it runs out.
    // The model prices a swap as fitted today either way, so acting now saves nothing here.
    expect(r.late!.label).toMatch(/^Acting late: ENG2 swapped for spare ESN-SNUG/);
    expect(r.doNothing).toBeCloseTo(r.late!.total, 3);
    expect(r.avoidable).toBeCloseTo(0, 3);
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

  it("decides by the recommended action's deadline: for an engine swap, 90 days' notice before ENG2 runs out", () => {
    expect(recommendTail(context(full, [snug])).decisionDeadline).toBe(less90(addMonths(AS_OF, 5)));
  });

  it('ranks lever 4 once when it lands on lever 1', () => {
    const r = recommendTail(context(full, [snug]));
    const l1 = r.options.find((o) => o.lever === 'L1')!;
    const l4 = r.options.find((o) => o.lever === 'L4')!;
    expect(l4.actionKey).toBe(l1.actionKey);
    expect(r.runnerUp!.lever).toBe('L1'); // not L4 as well
  });

  it('has nothing to decide when nothing is owed at handback: no option is weighed', () => {
    // ENG1 alone: clear of every threshold, so no exposure — no route change, no runner-up, nothing to book.
    const r = recommendTail(context(aircraft({}, [eng1])));
    expect(r.nothingToDecide).toBe(true);
    expect(r.options.map((o) => o.lever)).toEqual(['pay']);
    expect(r.runnerUp).toBeNull();
    expect(r.avoidable).toBe(0);
    expect(r.decisionDeadline).toBeNull();
    expect(r.trace).toContain('Nothing to decide');
  });

  it('never resolves a component that runs out to paying at handback: with nothing to keep it flying, the aircraft on the ground, priced', () => {
    // 300 FC left: out at month 3, before the first slot, and no spare to swap in or cover with. It
    // goes into the slot at month 4 and is back at month 10.6: 230 days on the ground.
    const early = component('engine', 'ENG2', { ...eng2, cso: 9_700 });
    const r = recommendTail(context(aircraft({}, [early])));
    expect(r.forced).not.toBeNull();
    // Out at month 3, the first slot at month 4: 30 days waiting, then the shop visit's 14 (§13).
    expect(r.recommended.lever).toBe('ground');
    expect(r.recommended.grounded!.days).toBe(44);
    expect(r.recommended.grounded!.cost).toBe(44 * 45_000);
    // Acting late books the slot only when it runs out (month 7): 122 days waiting — dearer.
    expect(r.late!.grounded!.days).toBe(122);
    expect(r.avoidable).toBeGreaterThan(0);
    expect(r.options.find((o) => o.lever === 'pay')!.feasible).toBe(false);
    expect(r.trace).toContain('On the ground from');
  });

  it('never recommends an infeasible option', () => {
    for (const ac of [full, aircraft({}, [eng1]), aircraft({}, [eng2])]) expect(recommendTail(context(ac, [snug])).recommended.feasible).toBe(true);
  });
});

describe('recommendFleet', () => {
  it('puts a spare on one aircraft only', () => {
    // Two identical tails, one right-sized spare. The first takes it; the second is left with
    // the shop visit, because its ENG2 still has to be dealt with.
    const a = aircraft({ tail: 'T-A' });
    const b = aircraft({ tail: 'T-B' });
    const data = { aircraft: [a, b], lessors: [lessor()], pool: [snug], returnConditions: [...conditions('T-A'), ...conditions('T-B')] };
    const r = recommendFleet(data, assessFleet({ asOf: AS_OF, ...data }), assumptions());
    expect(r.plans.filter((p) => p.label.includes('ESN-SNUG'))).toHaveLength(1);
    expect(r.plans.map((p) => p.recommendation.recommended.lever).sort()).toEqual(['L1', 'L3']);
  });

  it('adds up', () => {
    const a = aircraft({ tail: 'T-A' });
    const b = aircraft({ tail: 'T-B' });
    const data = { aircraft: [a, b], lessors: [lessor()], pool: [snug], returnConditions: [...conditions('T-A'), ...conditions('T-B')] };
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
    // Ten per cent more flying opens a shortfall on A6-MXM's ENG1: paying gives way to doing the work.
    const c = compareRecommendations(atRest, run({ utilisationMultiplier: 1.1 }));
    expect(c.changed.map((x) => x.tail)).toEqual(['A6-MXM']);
    for (const x of c.changed) expect(x).toMatchObject({ from: 'Pay at handback', to: expect.stringContaining('Do the work') });
  });

  it('does not count a different spare for the same swap as a change', () => {
    // 9H-ZUU's swap with another spare in place of ESN-6513 is the same decision.
    const p = atRest.byTail['9H-ZUU']!;
    const o = p.recommendation.recommended;
    const other = { ...o, actionKey: 'swap:ENG2:OTHER', move: { ...o.move!, incoming: { ...o.move!.incoming, id: 'OTHER', serial: 'ESN-OTHER' } } };
    expect(actionOf({ ...p, recommendation: { ...p.recommendation, recommended: other } })).toBe(actionOf(p));
  });

  it('names the action, not the month: the same visit a month later is the same decision', () => {
    const plan = atRest.byTail['A6-YTM']!;
    expect(actionOf(plan)).toBe('visit:ENG2:build-for-cash');
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
    // A forced tail is measured against acting late, which may put a spare on: there, life moves.
    for (const p of r.plans) if (!p.recommendation.recommended.move && !p.forced) expect(p.avoidableLife).toBeCloseTo(0, 3);
  });

  it('takes a removal forced by an engine running out with short notice — a conversation with the lessor, not a refusal', () => {
    // 9H-ZUU's ENG2 runs out on 7 Nov 2026, 35 days away: too soon for 12.3(b)'s 90 days, which ask
    // notice of a PLANNED removal. Notice goes now; ESN-6513 passes the replacement test.
    const zuu = r.byTail['9H-ZUU']!;
    expect(zuu.forced).not.toBeNull();
    expect(zuu.label).toBe('Swap ENG2 for spare ESN-6513');
    expect(zuu.decisionDeadline).toBe(data.asOf);
    expect(zuu.recommendation.recommended.trace).toContain('a conversation with the lessor, not a refusal');
    // The lease's other route, and the aircraft on the ground, are both priced.
    const cover = zuu.recommendation.options.find((o) => o.covers)!;
    expect(cover.feasible).toBe(true);
    expect(cover.label).toBe('Cover ENG2 with spare ESN-6508 while it goes to the shop');
    // On the ground until the first slot (month 4, 87 days), then the shop visit's 14.
    const ground = zuu.recommendation.options.find((o) => o.lever === 'ground')!;
    expect(ground.grounded!.days).toBe(101);
  });

  it('labels the tails that cannot reach handback as forced, not recommended', () => {
    // 9H-KVJ's APU, and the ENG2 of 9H-ZUU, A6-MVC and A6-YTM, each run out before handback.
    expect(r.plans.filter((p) => p.forced).map((p) => p.tail).sort()).toEqual(['9H-KVJ', '9H-ZUU', 'A6-MVC', 'A6-YTM']);
    for (const p of r.plans.filter((x) => x.forced)) {
      expect(p.forced).toContain('doing nothing is not an option');
      expect(p.recommendation.options.find((o) => o.lever === 'pay')!.feasible).toBe(false);
    }
    // Each is measured against acting late — nobody acts until the part runs out — not against a
    // handback cheque that assumed it could fly on.
    for (const p of r.plans.filter((x) => x.forced)) {
      expect(p.recommendation.late, p.tail).not.toBeNull();
      expect(p.doNothing).toBeCloseTo(p.recommendation.late!.total, 3);
      expect(p.trace).toContain('which for this tail is acting late');
    }
    for (const t of ['9H-KVJ', 'A6-MVC', 'A6-YTM']) expect(r.byTail[t]!.trace, t).toContain('Acting now saves');
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

  it('has no call on this fleet that the cost estimates cannot tell apart', () => {
    expect(r.totals.undecided).toBe(0);
    for (const p of r.plans) expect(p.recommendation.call.stands, p.tail).toBe(true);
  });

  it('refuses a swap the lease does not permit, with the clause and the shortfall', () => {
    const gpz = r.byTail['A6-GPZ']!.recommendation.options.find((o) => o.lever === 'L3')!;
    expect(gpz.trace).toContain(
      'not a permitted replacement under Clause 12.2(a): ESN-6519 has 673 fewer hours to its next shop visit and 355 fewer cycles to its next shop visit and 12,355 fewer LLP cycles than ENG1',
    );
  });

  it('gives a tail with no exposure nothing to decide — no recommendation, no routing suggestion, no note', () => {
    for (const t of ['9H-MMC', '9H-RYM', '9H-PJS']) {
      const p = r.byTail[t]!;
      expect(p.doNothing, t).toBe(0);
      expect(p.recommendation.nothingToDecide, t).toBe(true);
      expect(p.label).toBe('Nothing to decide — no exposure at handback');
      expect(p.recommendation.runnerUp).toBeNull();
      expect(p.recommendation.options.some((o) => o.lever === 'L2')).toBe(false);
      expect(p.decisionDeadline).toBeNull();
    }
    expect(r.totals.nothingToDecide).toBe(3);
    expect(r.totals.paying).toBe(2);
  });

  it('lets every recommendation with a real alternative stand, by a wide margin', () => {
    for (const t of ['A6-MVC', 'A6-DLL', 'A6-MXM', 'A6-YTM', '9H-ZUU', 'A6-GPZ', '9H-KVJ']) {
      const c = r.byTail[t]!.recommendation.call;
      expect(c.stands, t).toBe(true);
      expect(c.advantage, t).toBeGreaterThan(c.uncertainty * 1.5);
    }
  });
});
