// How firm is each recommendation: the sweep across every assumption's plausible range, the
// breakevens it finds, and the holds / close-call split. Checked on the generated fleet, and each
// breakeven is confirmed by re-recommending at it.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS, MODEL_NOISE, UTILISATION_NOISE } from './constants';
import { assessFleet } from './exposure';
import { usd } from './format';
import { actionOf, recommendFleet } from './recommend';
import { computeExtensionEffects, computeRobustness, readInput, writeInput } from './robustness';
import type { Dataset } from './types';

const data = dataset as unknown as Dataset;
const a = DEFAULT_ASSUMPTIONS;
const r = computeRobustness(data, a);
const plan = (x: typeof a) => recommendFleet(data, assessFleet(data, x), x);
const rest = plan(a);

describe('computeRobustness', () => {
  it('sweeps every assumption and records every returning tail on it', () => {
    expect(r.inputs.map((x) => x.input.id)).toEqual(ASSUMPTION_INPUTS.map((i) => i.id));
    for (const x of r.inputs) expect(Object.keys(x.byTail).sort()).toEqual(rest.plans.map((p) => p.tail).sort());
  });

  it('puts every tail in exactly one of three states: too close to call, close, firm', () => {
    expect(r.tooClose.length + r.close.length + r.firm.length).toBe(r.tails);
    for (const c of [...r.tooClose, ...r.close]) {
      expect(c.flip.reach).toBeGreaterThan(0);
      expect(c.flip.reach).toBeLessThanOrEqual(1);
    }
    // Too close to call: the flip lies inside the model's own noise. Close: no flip of that tail does.
    for (const c of r.tooClose) expect(c.flip.withinNoise).toBe(true);
    for (const c of r.close)
      for (const x of r.inputs) for (const f of [x.byTail[c.tail]!.down, x.byTail[c.tail]!.up]) if (f) expect(f.withinNoise).toBe(false);
    for (let i = 1; i < r.close.length; i++) expect(r.close[i]!.flip.reach).toBeGreaterThanOrEqual(r.close[i - 1]!.flip.reach);
  });

  it("uses one noise rule: the data's own ±10% utilisation noise, and the escalation spread on shop costs", () => {
    expect(MODEL_NOISE.utilisation).toBe(UTILISATION_NOISE);
    expect(MODEL_NOISE.maintenanceCost).toBe(0.1);
    expect(Object.keys(MODEL_NOISE).sort()).toEqual(['maintenanceCost', 'utilisation']);
  });

  it('finds each breakeven where it is: one step short, the answer stands; at it, the answer changes', () => {
    for (const x of r.inputs)
      for (const [tail, b] of Object.entries(x.byTail))
        for (const [dir, f] of [['down', b.down], ['up', b.up]] as const) {
          if (!f) continue;
          const sign = dir === 'down' ? 1 : -1;
          const before = f.value + sign * x.input.range.step;
          const at = plan(writeInput(a, x.input.id, f.value)).byTail[tail]!;
          expect(actionOf(at), `${tail} on ${x.input.id} at ${f.value}`).not.toBe(actionOf(rest.byTail[tail]!));
          expect(at.label).toBe(f.to);
          if (Math.abs(before - x.current) > 1e-9) {
            const short = plan(writeInput(a, x.input.id, before)).byTail[tail]!;
            expect(actionOf(short), `${tail} on ${x.input.id} at ${before}`).toBe(actionOf(rest.byTail[tail]!));
          }
        }
  });

  it('ranks at most three inputs as binding soonest, by reach', () => {
    expect(r.binding.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < r.binding.length; i++) expect(r.binding[i]!.first!.reach).toBeGreaterThanOrEqual(r.binding[i - 1]!.first!.reach);
    for (const x of r.binding) expect(x.input.source.length).toBeGreaterThan(10);
  });

  it('on this fleet: three too close to call, seven firm', () => {
    // A6-MXM flips at a percent more flying and A6-MVC at 8% — both inside the ±10% noise. 9H-MMC's
    // nearest flip by reach is +11%, but it also flips at 9% less flying, which is inside the noise.
    expect(r.tooClose.map((c) => [c.tail, c.flip.change])).toEqual([
      ['A6-MXM', '+1%'],
      ['A6-MVC', '+8%'],
      ['9H-MMC', '−9%'],
    ]);
    expect(r.tooClose.slice(0, 2).every((c) => c.flip.to.includes('Do the work'))).toBe(true);
    expect(r.close).toEqual([]);
    expect(r.firm).toHaveLength(7);
    expect(r.byTail['A6-MXM']).toBe('too-close');
    expect(r.binding[0]!.input.id).toBe('utilisation');
    // Shop costs change nothing anywhere between −9% and +50%.
    expect(r.inputs.find((x) => x.input.id === 'maintenanceCost')!.first).toBeNull();
  });

  it('sweeps from the assumptions it is given, not from the defaults', () => {
    const moved = writeInput(a, 'utilisation', 1.05);
    const m = computeRobustness(data, moved);
    expect(m.inputs.find((x) => x.input.id === 'utilisation')!.current).toBe(1.05);
    expect(readInput(moved, 'utilisation')).toBe(1.05);
  });

  it('leaves trace formatting on once it is done, and says how "close" is defined', () => {
    expect(usd(1_234)).toBe('$1,234');
    expect(r.trace).toContain('No round-number threshold');
    expect(r.trace).toContain('Too close to call');
    expect(r.trace).toContain('lower bound on fragility');
  });
});

describe('computeExtensionEffects — does the one control change anything?', () => {
  const e = computeExtensionEffects(data, a);
  const ext = (tail: string, n: number) => plan({ ...a, leaseExtensionMonths: { [tail]: n } });

  it('finds the shortest extension of each lease that changes any recommendation, or none', () => {
    expect(e.any).toBe(true);
    expect(e.byTail['A6-MXM']!.months).toBe(1);
    for (const t of ['A6-DLL', '9H-KVJ', '9H-ZUU', '9H-PJS']) expect(e.byTail[t]!.months, t).toBeNull();
  });

  it('is right about it: a month on A6-MXM changes an answer, a year on A6-DLL changes none', () => {
    const changed = ext('A6-MXM', 1).plans.filter((p) => actionOf(p) !== actionOf(rest.byTail[p.tail]!));
    expect(changed.map((p) => p.tail)).toEqual(e.byTail['A6-MXM']!.changes.map((c) => c.tail));
    const none = ext('A6-DLL', 12).plans.filter((p) => actionOf(p) !== actionOf(rest.byTail[p.tail]!));
    expect(none).toEqual([]);
  });
});
