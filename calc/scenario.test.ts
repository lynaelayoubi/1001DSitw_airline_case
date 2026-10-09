// One scenario: world changes and decisions together, against today's plan at the default assumptions.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS } from './constants';
import { closingDecisions } from './deadlines';
import { assessFleet } from './exposure';
import { compareRecommendations, recommendFleet } from './recommend';
import { readInput } from './robustness';
import { CLEARED_REFUSAL, EMPTY_SCENARIO, assignable, decisionChoices, runScenario } from './scenario';
import type { Dataset, Proposal } from './types';
import { whatIf, whatIfChoices } from './whatif';

const data = dataset as unknown as Dataset;
const fleet = assessFleet(data, DEFAULT_ASSUMPTIONS);
const today = recommendFleet(data, fleet, DEFAULT_ASSUMPTIONS);
const spare = (serial: string) => data.pool.find((u) => u.serial === serial)!.id;

describe('runScenario', () => {
  it('leaves the headline defaults as they are', () => {
    expect(today.totals.doNothing / 1e6).toBeCloseTo(40.025, 2);
    expect(today.totals.after / 1e6).toBeCloseTo(31.35, 2);
    expect(today.totals.avoidable / 1e6).toBeCloseTo(8.674, 2);
  });

  it('with no change, equals today’s plan in all three columns, with no aircraft changed', () => {
    const r = runScenario(data, today, EMPTY_SCENARIO);
    expect(r.today.allIn).toBeCloseTo(today.totals.after, 6);
    expect(r.world).toEqual(r.today);
    expect(r.scenario).toEqual(r.today);
    expect(r.changed).toEqual([]);
    expect(r.assumptions).toEqual(DEFAULT_ASSUMPTIONS);
  });

  it('moves the second and third totals equally when only the world changes', () => {
    const r = runScenario(data, today, { world: [{ input: 'maintenanceCost', value: 1.1 }], decisions: [] });
    expect(r.world.allIn).not.toBeCloseTo(r.today.allIn, 0);
    expect(r.scenario.allIn - r.today.allIn).toBeCloseTo(r.world.allIn - r.today.allIn, 6);
    expect(r.scenario).toEqual(r.world);
    // The same as applying no decision through the what-if itself.
    expect(whatIf(data, r.assumptions, r.worldPlan, []).scenario.totals.after).toBeCloseTo(r.world.allIn, 6);
  });

  it('combines a world change with decisions, and says why each aircraft changes', () => {
    // A6-DLL pays at handback today; swapping its gear for spare LG-6549 is the head of fleet's decision.
    const decisions: Proposal[] = [{ kind: 'swap', tail: 'A6-DLL', position: 'MLG', unit: spare('LG-6549') }];
    const r = runScenario(data, today, { world: [{ input: 'utilisation', value: 1.05 }], decisions });
    expect(r.decisions.map((d) => [d.proposal.tail, d.refused])).toEqual([['A6-DLL', null]]);
    expect(r.scenario.allIn).not.toBeCloseTo(r.world.allIn, 0);
    expect(r.changed.find((c) => c.tail === 'A6-DLL')?.why).toBe('decision');
    // Five per cent more flying opens a shortfall on A6-MXM's ENG1: the world changes its recommendation.
    expect(r.changed.find((c) => c.tail === 'A6-MXM')?.why).toBe('world');
    for (const c of r.changed) expect(['world', 'decision', 'knock-on']).toContain(c.why);
    // The scenario never touches today's plan.
    expect(today.totals.after / 1e6).toBeCloseTo(31.35, 2);
  });

  it('offers no decision on a cleared aircraft, and refuses one with the reason rather than pricing it', () => {
    // 9H-MMC, 9H-RYM and 9H-PJS have nothing to decide today: a decision on one cannot be priced fairly yet.
    const offered = decisionChoices(whatIfChoices(data, fleet), today);
    expect(offered.cleared.sort()).toEqual(['9H-MMC', '9H-PJS', '9H-RYM']);
    expect(offered.open.map((c) => c.tail)).not.toContain('9H-MMC');
    expect(offered.open).toHaveLength(7);
    const r = runScenario(data, today, { world: [], decisions: [{ kind: 'swap', tail: '9H-MMC', position: 'ENG1', unit: spare('ESN-6513') }] });
    expect(r.decisions[0]!.refused).toBe(CLEARED_REFUSAL);
    expect(r.scenario).toEqual(r.today);
    expect(r.changed).toEqual([]);
  });

  it('holds every world change inside its evidenced range', () => {
    const shop = ASSUMPTION_INPUTS.find((i) => i.id === 'maintenanceCost')!;
    const r = runScenario(data, today, { world: [{ input: 'maintenanceCost', value: 0.5 }], decisions: [] });
    expect(readInput(r.assumptions, 'maintenanceCost')).toBe(shop.range.min);
  });

  it("gives each aircraft that changes the scenario's own decide-by date and its money difference", () => {
    const r = runScenario(data, today, { world: [{ input: 'utilisation', value: 1.05 }], decisions: [{ kind: 'swap', tail: 'A6-DLL', position: 'MLG', unit: spare('LG-6549') }] });
    const items = closingDecisions(r.scenarioPlan, data.asOf).items;
    expect(r.changed.length).toBeGreaterThan(0);
    for (const c of r.changed) {
      const item = items.find((i) => i.tail === c.tail);
      expect(c.decideBy, c.tail).toBe(item ? (item.decideBy ?? item.grounded?.from ?? null) : null);
      expect(c.difference, c.tail).toBeCloseTo(r.scenarioPlan.byTail[c.tail]!.after - today.byTail[c.tail]!.after, 6);
    }
    expect(r.costChange).toBeCloseTo(r.scenario.allIn - r.today.allIn, 6);
    // The fleet the scenario was priced on is the one its plan was made from.
    expect(r.scenarioFleet.returning.map((t) => t.tail).sort()).toEqual(r.scenarioPlan.plans.map((p) => p.tail).sort());
  });
});

describe("the tool's advice and your decisions, kept apart", () => {
  const mxm = whatIfChoices(data, fleet).find((c) => c.tail === 'A6-MXM')!;
  const visit = { kind: 'visit' as const, tail: 'A6-MXM', position: 'ENG1', month: mxm.firstSlot, workscope: 'build-for-cash' as const };
  const contract = { input: 'maintenanceCost' as const, value: 0.91 };

  it('lists no decisions for a scenario of changed figures only, and the advice is what those figures change', () => {
    const r = runScenario(data, today, { world: [{ input: 'utilisation', value: 1.05 }], decisions: [] });
    expect(r.verdicts).toEqual([]);
    expect(r.advice.map((c) => c.tail)).toEqual(compareRecommendations(today, r.worldPlan).changed.map((c) => c.tail));
    expect(r.advice.map((c) => c.tail)).toEqual(['A6-MXM']);
    expect(r.worldEffects).toHaveLength(1);
    expect(r.worldEffects[0]!.difference).toBeCloseTo(r.world.allIn - r.today.allIn, 6);
  });

  it('offers no action for a decision worse than today\'s advice, and keeps it out of the advice and the headline', () => {
    // The renegotiated contract and A6-MXM's ENG1 to the shop: the visit costs more than paying at handback.
    const r = runScenario(data, today, { world: [contract], decisions: [visit] });
    const v = r.verdicts[0]!;
    expect(v.verdict).toBe('worse');
    expect(v.today).toEqual({ label: 'Pay at handback', lever: 'pay' });
    expect(v.difference / 1e6).toBeCloseTo(1.17, 2);
    expect(assignable(v)).toBe(false);
    // Judged at today's figures, on its own: the same with or without the contract.
    expect(runScenario(data, today, { world: [], decisions: [visit] }).verdicts[0]!.difference).toBeCloseTo(v.difference, 6);
    // A6-MXM changes only because of the decision: it is in the combined plan, never in the advice.
    expect(r.changed.map((c) => c.tail)).toContain('A6-MXM');
    expect(r.advice).toEqual([]);
    expect(r.worldEffects[0]!.difference / 1e6).toBeCloseTo(-1.97, 2);
    // Its date is the slot's lead time: today, to secure the first slot.
    expect(v.closing!.decideBy).toBe(data.asOf);
    expect(v.closing!.slotMonth).toBe('February 2027');
  });

  it('offers an action only for a decision better than today\'s plan, and never for a return date', () => {
    const r = runScenario(data, today, { world: [], decisions: [visit, { kind: 'return', tail: 'A6-YTM', months: 3 }] });
    const [worse, later] = r.verdicts;
    expect(later!.verdict).toBe('better');
    expect(later!.difference).toBeLessThan(0);
    expect(assignable(later!)).toBe(false); // agreed with the lessor, not assigned
    const better = { ...worse!, verdict: 'better' as const, difference: -1 };
    expect(assignable(better)).toBe(true);
    expect(assignable({ ...better, verdict: 'same' })).toBe(false);
    expect(assignable({ ...better, closing: null })).toBe(false);
  });

  it('says why the lease refuses a decision, and prices none of it', () => {
    const r = runScenario(data, today, { world: [], decisions: [{ kind: 'swap', tail: '9H-ZUU', position: 'ENG2', unit: spare('ESN-6512') }] });
    const v = r.verdicts[0]!;
    expect(v.verdict).toBe('refused');
    expect(v.refused).toContain('ESN-6512 would run out of cycles on 9H-ZUU around');
    expect(v.difference).toBe(0);
    expect(assignable(v)).toBe(false);
  });
});
