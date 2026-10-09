// One scenario: world changes and decisions together, against today's plan at the default assumptions.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS, SCENARIO_PRESETS } from './constants';
import { assessFleet } from './exposure';
import { recommendFleet } from './recommend';
import { readInput } from './robustness';
import { EMPTY_SCENARIO, runScenario } from './scenario';
import type { Dataset, Proposal } from './types';
import { whatIf } from './whatif';

const data = dataset as unknown as Dataset;
const today = recommendFleet(data, assessFleet(data, DEFAULT_ASSUMPTIONS), DEFAULT_ASSUMPTIONS);
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
    const decisions: Proposal[] = [
      // ESN-6513 passes 12.2 on 9H-MMC (ESN-6512 would not).
      { kind: 'swap', tail: '9H-MMC', position: 'ENG1', unit: spare('ESN-6513') },
      { kind: 'route', tail: '9H-RYM', profile: 'short-dense' },
    ];
    const r = runScenario(data, today, { world: [{ input: 'utilisation', value: 1.05 }], decisions });
    expect(r.decisions.filter((d) => !d.refused).map((d) => d.proposal.tail)).toEqual(['9H-MMC', '9H-RYM']);
    expect(r.scenario.allIn).not.toBeCloseTo(r.world.allIn, 0);
    for (const t of ['9H-MMC', '9H-RYM']) expect(r.changed.find((c) => c.tail === t)?.why, t).toBe('decision');
    // Five per cent more flying opens a shortfall on A6-MXM's ENG1: the world changes its recommendation.
    expect(r.changed.find((c) => c.tail === 'A6-MXM')?.why).toBe('world');
    for (const c of r.changed) expect(['world', 'decision', 'knock-on']).toContain(c.why);
    // The scenario never touches today's plan.
    expect(today.totals.after / 1e6).toBeCloseTo(31.35, 2);
  });

  it('holds every world change inside its evidenced range, the ready-made ones included', () => {
    const shop = ASSUMPTION_INPUTS.find((i) => i.id === 'maintenanceCost')!;
    const r = runScenario(data, today, { world: [{ input: 'maintenanceCost', value: 0.5 }], decisions: [] });
    expect(readInput(r.assumptions, 'maintenanceCost')).toBe(shop.range.min);
    for (const p of SCENARIO_PRESETS) {
      const range = ASSUMPTION_INPUTS.find((i) => i.id === p.input)!.range;
      expect(p.value, p.label).toBeGreaterThanOrEqual(range.min);
      expect(p.value, p.label).toBeLessThanOrEqual(range.max);
    }
  });
});
