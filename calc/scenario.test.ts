// One scenario: world changes and decisions together, against today's plan at the default assumptions.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS, WHAT_IF_STARTING_VALUES } from './constants';
import { closingDecisions } from './deadlines';
import { assessFleet } from './exposure';
import { recommendFleet } from './recommend';
import { readInput } from './robustness';
import { CLEARED_REFUSAL, EMPTY_SCENARIO, decisionChoices, runScenario } from './scenario';
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

  it('holds every world change inside its evidenced range, and every question starts inside it', () => {
    const shop = ASSUMPTION_INPUTS.find((i) => i.id === 'maintenanceCost')!;
    const r = runScenario(data, today, { world: [{ input: 'maintenanceCost', value: 0.5 }], decisions: [] });
    expect(readInput(r.assumptions, 'maintenanceCost')).toBe(shop.range.min);
    const inRange = (id: (typeof ASSUMPTION_INPUTS)[number]['id'], v: number) => {
      const range = ASSUMPTION_INPUTS.find((i) => i.id === id)!.range;
      return v >= range.min - 1e-9 && v <= range.max + 1e-9;
    };
    const s = WHAT_IF_STARTING_VALUES;
    expect(inRange('maintenanceCost', 1 + s.shopCostsUpPct / 100)).toBe(true);
    expect(inRange('maintenanceCost', 1 - s.shopCostsDownPct / 100)).toBe(true);
    expect(inRange('utilisation', 1 + s.flyingPct / 100)).toBe(true);
    expect(inRange('reservesReclaim', s.reservesClaimedPct / 100)).toBe(true);
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
