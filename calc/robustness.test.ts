// How firm is each recommendation: the sweep across every assumption's plausible range, the
// breakevens it finds, and the holds / close-call split. Checked on the generated fleet, and each
// breakeven is confirmed by re-recommending at it.

import { describe, expect, it } from 'vitest';

import dataset from '../data/fleet.json';
import { ASSUMPTION_INPUTS, DEFAULT_ASSUMPTIONS } from './constants';
import { assessFleet } from './exposure';
import { usd } from './format';
import { actionOf, recommendFleet } from './recommend';
import { computeExtensionEffects, computeRobustness, inputsLine, readInput, writeInput } from './robustness';
import type { Dataset } from './types';

const data = dataset as unknown as Dataset;
const a = DEFAULT_ASSUMPTIONS;
const r = computeRobustness(data, a);
const plan = (x: typeof a) => recommendFleet(data, assessFleet(data, x), x);
const rest = plan(a);

describe('computeRobustness', () => {
  it('sweeps from an override, and only toward an edge of the evidence that lies that way', () => {
    // Widebody downtime overridden to the top of its evidence: the sweep starts there, and has no room upward.
    const top = ASSUMPTION_INPUTS.find((i) => i.id === 'downtimeWidebody')!.range.max;
    const o = computeRobustness(data, writeInput(a, 'downtimeWidebody', top));
    const x = o.inputs.find((i) => i.input.id === 'downtimeWidebody')!;
    expect(x.current).toBe(top);
    for (const b of Object.values(x.byTail)) expect(b.up).toBeNull();
    for (const b of Object.values(x.byTail)) if (b.down) expect(b.down.value).toBeLessThan(top);
  });

  it('sweeps every assumption and records every returning tail on it', () => {
    expect(r.inputs.map((x) => x.input.id)).toEqual(ASSUMPTION_INPUTS.map((i) => i.id));
    for (const x of r.inputs) expect(Object.keys(x.byTail).sort()).toEqual(rest.plans.map((p) => p.tail).sort());
  });

  it('puts every tail in exactly one state: firm, close, no recommendation, or nothing to decide', () => {
    const nothing = Object.values(r.byTail).filter((x) => x === 'nothing to decide').length;
    expect(r.firm.length + r.close.length + r.undecided.length + nothing).toBe(r.tails);
    for (const c of r.close) {
      expect(c.flip.reach).toBeGreaterThan(0);
      expect(c.flip.reach).toBeLessThanOrEqual(1);
    }
    for (let i = 1; i < r.close.length; i++) expect(r.close[i]!.flip.reach).toBeGreaterThanOrEqual(r.close[i - 1]!.flip.reach);
    // How firm is only asked of a recommendation that stands.
    for (const x of r.undecided) expect(rest.byTail[x.tail]!.recommendation.call.stands).toBe(false);
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

  it('sorts every input into those that change some answer inside their evidence and those that change none', () => {
    expect([...r.changing, ...r.holding].map((x) => x.id).sort()).toEqual(ASSUMPTION_INPUTS.map((x) => x.id).sort());
    for (const x of r.inputs) expect(r.changing.includes(x.input)).toBe(x.first !== null);
  });

  it('on this fleet: four firm, three close, one with no recommendation, two with nothing to decide', () => {
    // Close: A6-MXM flips at a percent more flying, A6-MVC at 8%, 9H-MMC at 11% — all inside the evidenced +20%.
    expect(r.close.map((c) => [c.tail, c.flip.change])).toEqual([
      ['A6-MXM', '+1%'],
      ['A6-MVC', '+8%'],
      ['9H-MMC', '+11%'],
    ]);
    expect([...r.firm].sort()).toEqual(['9H-KVJ', '9H-ZUU', 'A6-DLL', 'A6-GPZ']);
    // No recommendation: A6-YTM's only alternative is a route change that comes to the same money.
    expect(r.undecided.map((x) => x.tail)).toEqual(['A6-YTM']);
    // No exposure: nothing to decide, so how firm is not asked.
    expect(r.byTail['9H-RYM']).toBe('nothing to decide');
    expect(r.byTail['9H-PJS']).toBe('nothing to decide');
    expect(r.byTail['A6-MXM']).toBe('close');
    // Only flying and the cost of a widebody day on the ground change anything inside their evidence.
    expect(r.changing.map((x) => x.id)).toEqual(['utilisation', 'downtimeWidebody']);
    expect(inputsLine(r.changing, r.holding)).toBe(
      'Inside their evidence, utilisation, widebody day on the ground change at least one answer; shop costs, narrowbody day on the ground, ' +
        "lessor's provider over our cost, share of reserves reclaimable, shop-slot lead time change none.",
    );
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
    expect(r.trace).toContain('told apart');
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
